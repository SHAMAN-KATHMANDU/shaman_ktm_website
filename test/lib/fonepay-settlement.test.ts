// Settlement invariants for POST /api/customer/payment/fonepay/status — the
// ONLY code path that can mark a Fonepay order paid.
//
// The gateway client itself is covered by fonepay.test.ts; what was untested
// until now is the thing that actually moves money into "paid":
//   · a confirmed, amount-matching success settles the order exactly once
//   · the WS message, the 15s poll and the manual button all race here, so a
//     second settle must NOT re-flip and must NOT fire a second Purchase
//   · Fonepay saying "success" for the WRONG AMOUNT must never settle
//   · an unreachable gateway must leave the order untouched (502, not "paid")
//
// The Fonepay HTTP surface and the session are stubbed; the route's own
// transaction/guard logic is the real thing. The Prisma fake implements the
// `verified: false` filter faithfully, because that filter IS the exactly-once
// guarantee — a fake that ignored it would pass while the real route broke.

import { describe, expect, it, beforeEach, vi } from "vitest";

interface OrderRow {
  id: string;
  number: string;
  customerId: string;
  total: number;
  status: string;
  paymentStatus: string;
  deliveryPhone: string;
  items: unknown[];
}
interface TxnRow {
  id: string;
  orderId: string;
  provider: string;
  referenceLabel: string;
  status: string;
  verified: boolean;
  refundOwed: boolean;
  fonepayTraceId: string | null;
  rawStatusPayload: unknown;
  errorMessage: string | null;
  createdAt: number;
}

const db = {
  order: null as OrderRow | null,
  txns: [] as TxnRow[],
};

const attempt = (n: number): TxnRow => ({
  id: `txn_${n}`,
  orderId: "order_1",
  provider: "fonepay",
  referenceLabel: `SK000042A${n}`,
  status: "pending",
  verified: false,
  refundOwed: false,
  fonepayTraceId: null,
  rawStatusPayload: null,
  errorMessage: null,
  createdAt: n,
});

function resetDb() {
  db.order = {
    id: "order_1",
    number: "SK-000042",
    customerId: "cust_1",
    total: 4500,
    status: "pending",
    paymentStatus: "pending",
    deliveryPhone: "9800000000",
    items: [],
  };
  db.txns = [attempt(1)];
}

type Where = Record<string, unknown>;
// Plain equality plus `{ not }`, which is all the guarded writes use.
const matches = (row: object, where: Where) =>
  Object.entries(where).every(([k, v]) => {
    const value = (row as Where)[k];
    return v && typeof v === "object" && "not" in v
      ? value !== (v as { not: unknown }).not
      : value === v;
  });

const client = {
  order: {
    findFirst: async ({ where }: { where: { number: string; customerId: string } }) =>
      db.order &&
      db.order.number === where.number &&
      db.order.customerId === where.customerId
        ? { ...db.order }
        : null,
    findUnique: async () => (db.order ? { ...db.order } : null),
    // The settle guard: paymentStatus "pending" and not cancelled, honoured
    // exactly as Postgres would.
    updateMany: async ({ where, data }: { where: Where; data: Partial<OrderRow> }) => {
      if (!db.order || !matches(db.order, where)) return { count: 0 };
      Object.assign(db.order, data);
      return { count: 1 };
    },
  },
  paymentTransaction: {
    findFirst: async ({ where }: { where: { orderId: string; referenceLabel: string } }) => {
      const t = db.txns.find(
        (row) => row.orderId === where.orderId && row.referenceLabel === where.referenceLabel,
      );
      return t ? { ...t } : null;
    },
    findMany: async ({ where }: { where: Where }) =>
      db.txns
        .filter((t) => matches(t, where))
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((t) => ({ ...t })),
    update: async ({ where, data }: { where: { id: string }; data: Partial<TxnRow> }) => {
      const t = db.txns.find((row) => row.id === where.id)!;
      Object.assign(t, data);
      return { ...t };
    },
    // The exactly-once guard: honour `verified: false` in the filter exactly
    // as Postgres would, so a second caller matches zero rows.
    updateMany: async ({ where, data }: { where: Where; data: Partial<TxnRow> }) => {
      const t = db.txns.find((row) => matches(row, where));
      if (!t) return { count: 0 };
      Object.assign(t, data);
      return { count: 1 };
    },
  },
};

// Interactive transaction: hand the callback the same client. Good enough here
// because the assertions are about the guard's filter, not about rollback.
const fakeTransaction = async (fn: (tx: typeof client) => Promise<unknown>) => fn(client);

vi.mock("@/lib/db", () => ({
  prisma: { ...client, $transaction: fakeTransaction },
}));

vi.mock("@/lib/auth/customer-guard", () => ({
  customerGuard: async () => ({
    ok: true,
    session: { customerId: "cust_1", email: "buyer@example.com" },
  }),
}));

const audit = vi.fn();
vi.mock("@/lib/audit", () => ({ logCustomerAction: (...a: unknown[]) => audit(...a) }));

const purchases = vi.fn();
vi.mock("@/lib/meta-capi", () => ({ sendPurchaseCapi: (...a: unknown[]) => purchases(...a) }));

const getPaymentStatus = vi.fn();
vi.mock("@/lib/payment/fonepay-intent", () => ({
  isFonepayConfigured: () => true,
  getPaymentStatus: (...a: unknown[]) => getPaymentStatus(...a),
}));

const { POST } = await import("@/app/api/customer/payment/fonepay/status/route");

function call(referenceLabel = "SK000042A1") {
  return POST(
    new Request("https://www.shamankathmandu.com/api/customer/payment/fonepay/status", {
      method: "POST",
      body: JSON.stringify({ orderNumber: "SK-000042", referenceLabel }),
    }),
  );
}

const success = (amount: number) => ({
  paymentStatus: "success" as const,
  fonepayTraceId: "TRACE-1",
  totalTransactionAmount: amount,
  paymentMessage: "ok",
  raw: { paymentStatus: "success" },
});

beforeEach(() => {
  resetDb();
  audit.mockClear();
  purchases.mockClear();
  getPaymentStatus.mockReset();
});

describe("fonepay settlement route", () => {
  it("settles an amount-matching success: order paid, attempt verified, Purchase fired once", async () => {
    getPaymentStatus.mockResolvedValue(success(4500));

    const res = await call();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ paymentStatus: "success", paid: true });
    expect(db.order!.paymentStatus).toBe("completed");
    expect(db.txns[0].verified).toBe(true);
    expect(db.txns[0].status).toBe("success");
    expect(db.txns[0].fonepayTraceId).toBe("TRACE-1");
    expect(purchases).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledTimes(1);
  });

  it("is idempotent under a GENUINELY concurrent double-settle: flips once, one Purchase", async () => {
    // Both callers must read the order while it is still "pending" — that is
    // the only interleaving where the exactly-once guard is load-bearing. Two
    // SEQUENTIAL calls would short-circuit on paymentStatus === "completed"
    // and never reach the flip at all, so this test holds the gateway reply
    // open until both callers are past the order read.
    let release: (v: unknown) => void;
    const gate = new Promise((r) => {
      release = r;
    });
    getPaymentStatus.mockImplementation(async () => {
      await gate;
      return success(4500);
    });

    const both = Promise.all([call(), call()]);
    await new Promise((r) => setImmediate(r)); // let both reach the gate
    release!(null);
    const [a, b] = await both;

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(db.order!.paymentStatus).toBe("completed");
    expect(db.txns[0].verified).toBe(true);
    // The whole point: only the caller that won the flip fires the side effects.
    expect(purchases).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledTimes(1);
  });

  it("does NOT settle when Fonepay reports a different amount (409)", async () => {
    getPaymentStatus.mockResolvedValue(success(450)); // a decimal-point slip

    const res = await call();

    expect(res.status).toBe(409);
    expect(db.order!.paymentStatus).toBe("pending");
    expect(db.txns[0].verified).toBe(false);
    expect(db.txns[0].errorMessage).toContain("Amount mismatch");
    expect(purchases).not.toHaveBeenCalled();
  });

  it("does NOT settle when the gateway is unreachable (502)", async () => {
    getPaymentStatus.mockRejectedValue(new Error("Fonepay request failed: timeout"));

    const res = await call();

    expect(res.status).toBe(502);
    expect(db.order!.paymentStatus).toBe("pending");
    expect(db.txns[0].verified).toBe(false);
    expect(purchases).not.toHaveBeenCalled();
  });

  it("records a pending/failed attempt without touching the order", async () => {
    getPaymentStatus.mockResolvedValue({
      paymentStatus: "failed" as const,
      fonepayTraceId: "TRACE-2",
      totalTransactionAmount: null,
      paymentMessage: "cancelled by user",
      raw: {},
    });

    const res = await call();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ paymentStatus: "failed", paid: false });
    expect(db.order!.paymentStatus).toBe("pending");
    expect(db.txns[0].status).toBe("failed");
    expect(db.txns[0].errorMessage).toBe("cancelled by user");
    expect(purchases).not.toHaveBeenCalled();
  });

  it("does not ask Fonepay again about an attempt already verified", async () => {
    db.order!.paymentStatus = "completed";
    Object.assign(db.txns[0], { status: "success", verified: true });

    const res = await call();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ paid: true });
    expect(getPaymentStatus).not.toHaveBeenCalled();
  });
});

// Audit #2 and #3: every unverified attempt is checked, and money the order
// cannot take is recorded as refund owed instead of silently settling.
describe("several attempts, and payments the order cannot take", () => {
  const byLabel = (paid: Record<string, number>) =>
    getPaymentStatus.mockImplementation(async (label: string) =>
      label in paid
        ? success(paid[label])
        : { paymentStatus: "pending" as const, fonepayTraceId: null, totalTransactionAmount: null, paymentMessage: "", raw: {} },
    );

  it("settles from an OLDER attempt even when the browser polls the newest", async () => {
    db.txns.push(attempt(2));
    byLabel({ SK000042A1: 4500 });

    const res = await call("SK000042A2");

    await expect(res.json()).resolves.toMatchObject({ paid: true });
    expect(db.order!.paymentStatus).toBe("completed");
    expect(db.txns[0].verified).toBe(true);
    expect(purchases).toHaveBeenCalledTimes(1);
  });

  it("records a second successful attempt as a duplicate payment, refund owed", async () => {
    db.txns.push(attempt(2));
    byLabel({ SK000042A1: 4500, SK000042A2: 4500 });

    const res = await call();

    expect(res.status).toBe(200);
    expect(db.order!.paymentStatus).toBe("completed");
    expect(db.txns[0]).toMatchObject({ verified: true, refundOwed: false });
    expect(db.txns[1]).toMatchObject({ verified: true, refundOwed: true });
    expect(db.txns[1].errorMessage).toMatch(/duplicate payment/i);
    expect(purchases).toHaveBeenCalledTimes(1);
  });

  it("never settles a cancelled order: 409, attempt flagged refund owed", async () => {
    db.order!.status = "cancelled";
    byLabel({ SK000042A1: 4500 });

    const res = await call();

    expect(res.status).toBe(409);
    expect(db.order!.paymentStatus).toBe("pending");
    expect(db.txns[0].refundOwed).toBe(true);
    expect(db.txns[0].errorMessage).toMatch(/cancelled/i);
    expect(purchases).not.toHaveBeenCalled();
  });
});
