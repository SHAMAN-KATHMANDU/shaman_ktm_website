// Stock ledger invariants. The ledger is the reporting system's source of
// truth for inventory, so these are the rules that must never regress:
//   · pools are separate per showroom (no cross-showroom draw)
//   · a pool can never go negative
//   · StockLevel.qty and ProductVariation.stock are materialized from movements
//   · history is append-only — a mistake becomes a new reversing row
//
// Prisma is faked in memory (the suite has no database), close enough to model
// the guarded-decrement contract: updateMany with a `qty >= n` filter matches
// zero rows when the pool is short.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { Prisma } from "@prisma/client";

const txFaults = { conflicts: 0, attempts: 0 };

interface LevelRec {
  id: string;
  variationId: string;
  showroomKey: string;
  qty: number;
  updatedAt: Date;
}
interface MovementRec {
  id: string;
  variationId: string;
  showroomKey: string;
  delta: number;
  reason: string;
  refType: string | null;
  refId: string | null;
  staffId: string | null;
  note: string | null;
  createdAt: Date;
}

const db = {
  variations: new Map<string, { id: string; stock: number }>(),
  showrooms: new Set<string>(),
  levels: [] as LevelRec[],
  movements: [] as MovementRec[],
  seq: 0,
};

const nextId = (p: string) => `${p}_${++db.seq}`;

function findLevel(variationId: string, showroomKey: string) {
  return db.levels.find(
    (l) => l.variationId === variationId && l.showroomKey === showroomKey,
  );
}

// Order of the statements that matter for audit #12.
const statements: string[] = [];

const client = {
  // applyMovement's `SELECT … FOR UPDATE` row lock on the variation.
  $queryRaw: async (sql: TemplateStringsArray, id: string) => {
    statements.push(sql.join("?").includes("FOR UPDATE") ? "lock" : "raw");
    return db.variations.has(id) ? [{ id }] : [];
  },
  productVariation: {
    findUnique: async ({ where }: { where: { id: string } }) =>
      db.variations.get(where.id) ?? null,
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: { stock: number };
    }) => {
      const v = db.variations.get(where.id);
      if (v) v.stock = data.stock;
      return v;
    },
  },
  showroom: {
    findUnique: async ({ where }: { where: { key: string } }) =>
      db.showrooms.has(where.key) ? { key: where.key } : null,
    findMany: async () => [...db.showrooms].map((key) => ({ key })),
  },
  stockLevel: {
    // Guarded decrement: the `qty: { gte: n }` filter is what prevents oversell.
    updateMany: async ({
      where,
      data,
    }: {
      where: { variationId: string; showroomKey: string; qty: { gte: number } };
      data: { qty: { decrement: number } };
    }) => {
      const level = findLevel(where.variationId, where.showroomKey);
      if (!level || level.qty < where.qty.gte) return { count: 0 };
      level.qty -= data.qty.decrement;
      level.updatedAt = new Date();
      return { count: 1 };
    },
    upsert: async ({
      where,
      update,
      create,
    }: {
      where: { variationId_showroomKey: { variationId: string; showroomKey: string } };
      update: { qty: { increment: number } };
      create: { variationId: string; showroomKey: string; qty: number };
    }) => {
      const { variationId, showroomKey } = where.variationId_showroomKey;
      const existing = findLevel(variationId, showroomKey);
      if (existing) {
        existing.qty += update.qty.increment;
        existing.updatedAt = new Date();
        return existing;
      }
      const row: LevelRec = {
        id: nextId("lvl"),
        ...create,
        updatedAt: new Date(),
      };
      db.levels.push(row);
      return row;
    },
    findUnique: async ({
      where,
    }: {
      where: { variationId_showroomKey: { variationId: string; showroomKey: string } };
    }) => {
      const { variationId, showroomKey } = where.variationId_showroomKey;
      return findLevel(variationId, showroomKey) ?? null;
    },
    aggregate: async ({ where }: { where: { variationId: string } }) => (statements.push("sum"), {
      _sum: {
        qty: db.levels
          .filter((l) => l.variationId === where.variationId)
          .reduce((sum, l) => sum + l.qty, 0),
      },
    }),
  },
  stockMovement: {
    create: async ({ data }: { data: Omit<MovementRec, "id" | "createdAt"> }) => {
      const row: MovementRec = { id: nextId("mv"), createdAt: new Date(), ...data };
      db.movements.push(row);
      return row;
    },
    findUnique: async ({ where }: { where: { id: string } }) =>
      db.movements.find((m) => m.id === where.id) ?? null,
    findFirst: async ({ where }: { where: Record<string, unknown> }) =>
      db.movements.find((m) =>
        Object.entries(where).every(
          ([k, v]) => (m as unknown as Record<string, unknown>)[k] === v,
        ),
      ) ?? null,
  },
};

vi.mock("@/lib/db", () => ({
  prisma: {
    ...client,
    // Fake transactions run the callback inline; a thrown error propagates,
    // which is all these tests need to assert atomic rejection. `conflicts`
    // makes the next N transactions abort like a Postgres serialization
    // failure (P2034) before doing anything.
    $transaction: async (fn: (tx: typeof client) => unknown) => {
      if (txFaults.conflicts > 0) {
        txFaults.conflicts--;
        txFaults.attempts++;
        throw new Prisma.PrismaClientKnownRequestError("serialization failure", {
          code: "P2034",
          clientVersion: "test",
        });
      }
      txFaults.attempts++;
      return fn(client);
    },
  },
}));

const {
  recordStockMovement,
  reconcileStockCount,
  transferStock,
  withSerializableRetry,
} = await import("@/lib/stock");
const { CmsError } = await import("@/lib/cms/errors");

const VARIATION = "var1";
const OTHER_VARIATION = "var2";

beforeEach(() => {
  txFaults.conflicts = 0;
  txFaults.attempts = 0;
  statements.length = 0;
  db.variations = new Map([
    [VARIATION, { id: VARIATION, stock: 0 }],
    [OTHER_VARIATION, { id: OTHER_VARIATION, stock: 0 }],
  ]);
  db.showrooms = new Set(["thamel", "gongabu"]);
  db.levels = [];
  db.movements = [];
  db.seq = 0;
});

const seed = (showroomKey: string, qty: number, variationId = VARIATION) =>
  recordStockMovement({
    variationId,
    showroomKey,
    delta: qty,
    reason: "initial_seed",
  });

describe("recordStockMovement", () => {
  it("creates the pool on first movement and materializes both sums", async () => {
    await seed("thamel", 10);
    expect(findLevel(VARIATION, "thamel")?.qty).toBe(10);
    expect(db.variations.get(VARIATION)?.stock).toBe(10);
    expect(db.movements).toHaveLength(1);
    expect(db.movements[0].reason).toBe("initial_seed");
  });

  it("keeps showroom pools separate and sums them into variation stock", async () => {
    await seed("thamel", 10);
    await seed("gongabu", 4);
    expect(findLevel(VARIATION, "thamel")?.qty).toBe(10);
    expect(findLevel(VARIATION, "gongabu")?.qty).toBe(4);
    // ProductVariation.stock is the Σ across pools (storefront availability).
    expect(db.variations.get(VARIATION)?.stock).toBe(14);
  });

  it("decrements the named pool only", async () => {
    await seed("thamel", 10);
    await seed("gongabu", 4);
    await recordStockMovement({
      variationId: VARIATION,
      showroomKey: "thamel",
      delta: -3,
      reason: "sale",
      refType: "Sale",
      refId: "sale1",
    });
    expect(findLevel(VARIATION, "thamel")?.qty).toBe(7);
    expect(findLevel(VARIATION, "gongabu")?.qty).toBe(4);
    expect(db.variations.get(VARIATION)?.stock).toBe(11);
  });

  it("refuses to take a pool negative and writes no movement", async () => {
    await seed("thamel", 2);
    await expect(
      recordStockMovement({
        variationId: VARIATION,
        showroomKey: "thamel",
        delta: -3,
        reason: "sale",
      }),
    ).rejects.toThrow(CmsError);
    expect(findLevel(VARIATION, "thamel")?.qty).toBe(2);
    // Only the seed row exists — the rejected sale left no ledger trace.
    expect(db.movements).toHaveLength(1);
  });

  it("never draws from another showroom's pool", async () => {
    await seed("gongabu", 10);
    await expect(
      recordStockMovement({
        variationId: VARIATION,
        showroomKey: "thamel",
        delta: -1,
        reason: "sale",
      }),
    ).rejects.toThrow(CmsError);
    expect(findLevel(VARIATION, "gongabu")?.qty).toBe(10);
  });

  it("rejects a zero or fractional delta", async () => {
    for (const delta of [0, 1.5]) {
      await expect(
        recordStockMovement({
          variationId: VARIATION,
          showroomKey: "thamel",
          delta,
          reason: "adjustment",
        }),
      ).rejects.toThrow(CmsError);
    }
  });

  it("rejects an unknown reason, listing the valid ones", async () => {
    await expect(
      recordStockMovement({
        variationId: VARIATION,
        showroomKey: "thamel",
        delta: 1,
        // @ts-expect-error — deliberately invalid reason
        reason: "shrinkage",
      }),
    ).rejects.toThrow(/reason/i);
  });

  it("rejects unknown variation and unknown showroom", async () => {
    await expect(
      recordStockMovement({
        variationId: "nope",
        showroomKey: "thamel",
        delta: 1,
        reason: "adjustment",
      }),
    ).rejects.toThrow(CmsError);
    await expect(
      recordStockMovement({
        variationId: VARIATION,
        showroomKey: "kathmandu-mall",
        delta: 1,
        reason: "adjustment",
      }),
    ).rejects.toThrow(CmsError);
  });
});

describe("transferStock", () => {
  it("writes two linked movements and moves the quantity", async () => {
    await seed("thamel", 10);
    const result = await transferStock({
      variationId: VARIATION,
      fromShowroomKey: "thamel",
      toShowroomKey: "gongabu",
      qty: 4,
    });
    expect(findLevel(VARIATION, "thamel")?.qty).toBe(6);
    expect(findLevel(VARIATION, "gongabu")?.qty).toBe(4);
    // Total across pools is unchanged by a transfer.
    expect(db.variations.get(VARIATION)?.stock).toBe(10);
    const transfers = db.movements.filter((m) => m.reason === "transfer");
    expect(transfers).toHaveLength(2);
    expect(transfers.every((m) => m.refId === result.refId)).toBe(true);
    expect(transfers.map((m) => m.delta).sort((a, b) => a - b)).toEqual([-4, 4]);
  });

  it("rejects a same-showroom transfer and a non-positive qty", async () => {
    await seed("thamel", 10);
    await expect(
      transferStock({
        variationId: VARIATION,
        fromShowroomKey: "thamel",
        toShowroomKey: "thamel",
        qty: 1,
      }),
    ).rejects.toThrow(CmsError);
    await expect(
      transferStock({
        variationId: VARIATION,
        fromShowroomKey: "thamel",
        toShowroomKey: "gongabu",
        qty: 0,
      }),
    ).rejects.toThrow(CmsError);
  });

  it("fails whole when the source pool is short", async () => {
    await seed("thamel", 2);
    await expect(
      transferStock({
        variationId: VARIATION,
        fromShowroomKey: "thamel",
        toShowroomKey: "gongabu",
        qty: 5,
      }),
    ).rejects.toThrow(CmsError);
    expect(findLevel(VARIATION, "thamel")?.qty).toBe(2);
    expect(findLevel(VARIATION, "gongabu")).toBeUndefined();
  });
});

describe("reconcileStockCount", () => {
  it("derives the correction from an absolute physical count", async () => {
    await seed("thamel", 10);
    const movement = await reconcileStockCount({
      variationId: VARIATION,
      showroomKey: "thamel",
      countedQty: 7,
    });
    expect(movement.delta).toBe(-3);
    expect(findLevel(VARIATION, "thamel")?.qty).toBe(7);
    expect(db.variations.get(VARIATION)?.stock).toBe(7);
  });

  it("cannot create an uninitialized pool or write a no-op count", async () => {
    await expect(
      reconcileStockCount({ variationId: VARIATION, showroomKey: "thamel", countedQty: 5 }),
    ).rejects.toThrow(/transfer/i);
    await seed("thamel", 5);
    await expect(
      reconcileStockCount({ variationId: VARIATION, showroomKey: "thamel", countedQty: 5 }),
    ).rejects.toThrow(/no correction/i);
  });
});

// Audit #10: Serializable transactions abort under concurrent stock writes;
// that is expected, so the write is re-run instead of surfacing as a 500.
describe("serialization conflicts", () => {
  it("re-runs a movement aborted by a serialization conflict", async () => {
    await seed("thamel", 5);
    txFaults.conflicts = 2;
    txFaults.attempts = 0;
    await recordStockMovement({
      variationId: VARIATION,
      showroomKey: "thamel",
      delta: -1,
      reason: "sale",
    });
    expect(txFaults.attempts).toBe(3);
    expect(findLevel(VARIATION, "thamel")?.qty).toBe(4);
  });

  it("gives up after three attempts, and never retries other errors", async () => {
    txFaults.conflicts = 3;
    await expect(
      recordStockMovement({ variationId: VARIATION, showroomKey: "thamel", delta: 1, reason: "return" }),
    ).rejects.toMatchObject({ code: "P2034" });

    let calls = 0;
    await expect(
      withSerializableRetry(async () => {
        calls++;
        throw new Error("not a conflict");
      }),
    ).rejects.toThrow("not a conflict");
    expect(calls).toBe(1);
  });
});

// Audit #12: ProductVariation.stock is the sum over every pool, so the
// variation row is locked before any pool is touched and before the sum is
// read. (The fake can only show the order of statements; the blocking itself
// is Postgres's FOR UPDATE and is not exercised here.)
describe("variation-level sum", () => {
  it("locks the variation row before recomputing the cross-pool sum", async () => {
    await seed("thamel", 5);
    statements.length = 0;
    await recordStockMovement({ variationId: VARIATION, showroomKey: "thamel", delta: -1, reason: "sale" });
    expect(statements).toEqual(["lock", "sum"]);
  });

  it("still reports an unknown variation as 404", async () => {
    await expect(
      recordStockMovement({ variationId: "ghost", showroomKey: "thamel", delta: 1, reason: "return" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
