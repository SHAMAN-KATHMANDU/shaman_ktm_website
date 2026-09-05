// Sales-bot invariants. The bot is an input path onto the same tables, never a
// bypass, so:
//   · a webhook re-delivery cannot post a second sale (dedup before any work)
//   · an unregistered or inactive Telegram user records nothing
//   · a floater must say which showroom before anything is scanned
//   · the bot creates a DRAFT that holds no stock; only an explicit confirm moves it
//   · a failed confirm leaves the draft alone rather than losing the work
//   · the payment screenshot is asked for outright and retained (decision #9)
//
// The Telegram HTTP surface is stubbed; the sales/stock services underneath are
// the real ones, running against the in-memory Prisma fake.

import { describe, expect, it, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

const db = {
  staff: [] as Row[],
  showrooms: [] as Row[],
  products: [] as Row[],
  variations: [] as Row[],
  paymentMethods: [] as Row[],
  sessions: [] as Row[],
  updates: [] as Row[],
  sales: [] as Row[],
  saleLines: [] as Row[],
  saleStaff: [] as Row[],
  stockLevels: [] as Row[],
  stockMovements: [] as Row[],
  counter: { id: 1, value: 0 },
  seq: 0,
};

const nextId = (p: string) => `${p}_${++db.seq}`;

// Deep copy that keeps Date instances as Dates — real Prisma hands back Dates,
// and a JSON round-trip would silently turn them into strings.
function clone<T>(v: T): T {
  if (v instanceof Date) return new Date(v.getTime()) as T;
  if (Array.isArray(v)) return v.map((x) => clone(x)) as T;
  if (v && typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, clone(val)]),
    ) as T;
  }
  return v;
}

function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (v === undefined) return true;
    if (k === "OR" && Array.isArray(v)) return (v as Row[]).some((c) => matches(row, c));
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      const c = v as Row;
      if ("not" in c) return row[k] !== c.not;
      if ("gte" in c) return (row[k] as number) >= (c.gte as number);
      if ("in" in c) return (c.in as unknown[]).includes(row[k]);
    }
    return row[k] === v;
  });
}

function model(store: () => Row[], opts: { unique?: string[] } = {}) {
  return {
    findUnique: async ({ where, include }: { where: Row; include?: Row }) => {
      const nested = Object.values(where).find(
        (v) => v && typeof v === "object" && !(v instanceof Date),
      ) as Row | undefined;
      const row = store().find((r) => matches(r, nested ?? where));
      return row ? hydrate(row, include) : null;
    },
    findFirst: async ({ where, include }: { where?: Row; include?: Row } = {}) => {
      const row = store().find((r) => matches(r, where ?? {}));
      return row ? hydrate(row, include) : null;
    },
    findMany: async ({ where, include }: { where?: Row; include?: Row } = {}) =>
      store()
        .filter((r) => matches(r, where ?? {}))
        .map((r) => hydrate(r, include)),
    count: async ({ where }: { where?: Row } = {}) =>
      store().filter((r) => matches(r, where ?? {})).length,
    // Emulates skipDuplicates against the same unique keys, which is how the
    // dedup claim actually works.
    createMany: async ({
      data,
      skipDuplicates,
    }: {
      data: Row[];
      skipDuplicates?: boolean;
    }) => {
      let count = 0;
      for (const d of data) {
        const clash = (opts.unique ?? []).some((key) => {
          const fields = key.split("+");
          return store().some((r) => fields.every((f) => r[f] === d[f]));
        });
        if (clash && skipDuplicates) continue;
        store().push({ id: nextId("row"), ...d });
        count++;
      }
      return { count };
    },
    create: async ({ data, include }: { data: Row; include?: Row }) => {
      // Emulate the unique constraints the dedup relies on.
      for (const key of opts.unique ?? []) {
        const fields = key.split("+");
        const clash = store().find((r) => fields.every((f) => r[f] === data[f]));
        if (clash) {
          const e = new Error("Unique constraint failed") as Error & { code: string };
          e.code = "P2002";
          throw e;
        }
      }
      const { lines, staff, ...rest } = data as Row & {
        lines?: { createMany: { data: Row[] } };
        staff?: { createMany: { data: Row[] } };
      };
      const row: Row = { id: nextId("row"), ...rest };
      store().push(row);
      for (const l of lines?.createMany.data ?? []) {
        db.saleLines.push({ id: nextId("line"), saleId: row.id, ...l });
      }
      for (const s of staff?.createMany.data ?? []) {
        db.saleStaff.push({ saleId: row.id, ...s });
      }
      return hydrate(row, include);
    },
    update: async ({ where, data, include }: { where: Row; data: Row; include?: Row }) => {
      const row = store().find((r) => matches(r, where));
      if (!row) throw new Error("row not found in fake");
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === "object" && "increment" in (v as Row)) {
          row[k] = ((row[k] as number) ?? 0) + ((v as Row).increment as number);
        } else if (v && typeof v === "object" && "decrement" in (v as Row)) {
          row[k] = ((row[k] as number) ?? 0) - ((v as Row).decrement as number);
        } else row[k] = v;
      }
      return hydrate(row, include);
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = store().filter((r) => matches(r, where));
      for (const r of rows) Object.assign(r, data);
      return { count: rows.length };
    },
    upsert: async ({ where, update, create }: { where: Row; update: Row; create: Row }) => {
      const nested = Object.values(where).find(
        (v) => v && typeof v === "object" && !(v instanceof Date),
      ) as Row | undefined;
      const row = store().find((r) => matches(r, nested ?? where));
      if (row) {
        for (const [k, v] of Object.entries(update)) {
          if (v && typeof v === "object" && "increment" in (v as Row)) {
            row[k] = ((row[k] as number) ?? 0) + ((v as Row).increment as number);
          } else row[k] = v;
        }
        return clone(row);
      }
      const created: Row = { id: nextId("row"), ...create };
      store().push(created);
      return clone(created);
    },
    delete: async ({ where }: { where: Row }) => {
      const i = store().findIndex((r) => matches(r, where));
      if (i < 0) throw new Error("row not found in fake");
      return clone(store().splice(i, 1)[0]);
    },
    deleteMany: async ({ where }: { where?: Row } = {}) => {
      const keep = store().filter((r) => !matches(r, where ?? {}));
      const n = store().length - keep.length;
      store().length = 0;
      store().push(...keep);
      return { count: n };
    },
    aggregate: async ({ where, _sum }: { where?: Row; _sum?: Row }) => {
      const rows = store().filter((r) => matches(r, where ?? {}));
      const field = Object.keys(_sum ?? {})[0];
      return {
        _sum: {
          [field]: rows.length ? rows.reduce((s, r) => s + ((r[field] as number) ?? 0), 0) : null,
        },
      };
    },
  };
}

function hydrate(row: Row, include?: Row): Row {
  const out = clone(row);
  if (include?.lines) out.lines = db.saleLines.filter((l) => l.saleId === row.id).map(clone);
  if (include?.staff) out.staff = db.saleStaff.filter((s) => s.saleId === row.id).map(clone);
  if (include?.variations) {
    out.variations = db.variations.filter((v) => v.productId === row.id).map(clone);
  }
  return out;
}

const client = {
  staff: model(() => db.staff),
  showroom: model(() => db.showrooms),
  product: {
    ...model(() => db.products),
    findFirst: async ({ where, select }: { where?: Row; select?: Row }) => {
      const row = db.products.find((r) => matches(r, where ?? {}));
      if (!row) return null;
      const out = clone(row);
      if (select?.variations) {
        const variationSelect = select.variations as Row;
        const stockLevelWhere = ((variationSelect.select as Row | undefined)?.stockLevels as Row | undefined)
          ?.where as Row | undefined;
        out.variations = db.variations
          .filter((v) => v.productId === row.id && v.active !== false)
          .map((variation) => ({
            ...clone(variation),
            stockLevels: db.stockLevels
              .filter((level) =>
                level.variationId === variation.id && matches(level, stockLevelWhere ?? {}),
              )
              .map(clone),
          }));
      }
      return out;
    },
  },
  productVariation: model(() => db.variations),
  paymentMethodLookup: model(() => db.paymentMethods),
  telegramSession: model(() => db.sessions),
  telegramUpdate: model(() => db.updates, {
    unique: ["bot+chatId+telegramMessageId"],
  }),
  sale: model(() => db.sales),
  saleLine: model(() => db.saleLines),
  saleStaff: model(() => db.saleStaff),
  saleCounter: {
    upsert: async ({ update }: { update: { value: { increment: number } } }) => {
      db.counter.value += update.value.increment;
      return clone(db.counter);
    },
  },
  stockLevel: {
    ...model(() => db.stockLevels),
    findUnique: async ({ where }: { where: Row }) => {
      const k = where.variationId_showroomKey as Row;
      const row = db.stockLevels.find(
        (l) => l.variationId === k.variationId && l.showroomKey === k.showroomKey,
      );
      return row ? clone(row) : null;
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const min = (where.qty as { gte: number }).gte;
      const row = db.stockLevels.find(
        (l) =>
          l.variationId === where.variationId &&
          l.showroomKey === where.showroomKey &&
          (l.qty as number) >= min,
      );
      if (!row) return { count: 0 };
      row.qty = (row.qty as number) - ((data.qty as Row).decrement as number);
      return { count: 1 };
    },
    upsert: async ({ where, update, create }: { where: Row; update: Row; create: Row }) => {
      const k = where.variationId_showroomKey as Row;
      const row = db.stockLevels.find(
        (l) => l.variationId === k.variationId && l.showroomKey === k.showroomKey,
      );
      if (row) {
        row.qty = (row.qty as number) + ((update.qty as Row).increment as number);
        return clone(row);
      }
      const created: Row = { id: nextId("lvl"), ...create };
      db.stockLevels.push(created);
      return clone(created);
    },
    aggregate: async ({ where }: { where: Row }) => ({
      _sum: {
        qty: db.stockLevels
          .filter((l) => l.variationId === where.variationId)
          .reduce((s, l) => s + ((l.qty as number) ?? 0), 0),
      },
    }),
  },
  stockMovement: model(() => db.stockMovements),
  crmLead: model(() => []),
  crmLeadStatusHistory: model(() => []),
};

// Real rollback: snapshot every store, restore on throw. Without this, a
// confirm that fails on insufficient stock would appear to leave the sale
// "confirmed" — the opposite of what Postgres does, and it would hide the very
// guarantee these tests exist to check.
async function fakeTransaction<T>(fn: (tx: typeof client) => Promise<T>): Promise<T> {
  const snap = clone({
    staff: db.staff,
    showrooms: db.showrooms,
    products: db.products,
    variations: db.variations,
    paymentMethods: db.paymentMethods,
    sessions: db.sessions,
    updates: db.updates,
    sales: db.sales,
    saleLines: db.saleLines,
    saleStaff: db.saleStaff,
    stockLevels: db.stockLevels,
    stockMovements: db.stockMovements,
    counter: db.counter,
  });
  try {
    return await fn(client);
  } catch (err) {
    Object.assign(db, snap);
    throw err;
  }
}

vi.mock("@/lib/db", () => ({
  prisma: { ...client, $transaction: fakeTransaction },
}));

// Telegram's HTTP surface, stubbed. `sent` is what the staff member would see.
const sent: { text: string; buttons: string[] }[] = [];
vi.mock("@/lib/telegram/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/telegram/core")>();
  return {
    ...actual,
    sendMessage: async (
      _t: string,
      _c: string,
      text: string,
      buttons?: { text: string; data: string }[][],
    ) => {
      sent.push({
        text,
        buttons: (buttons ?? []).flat().map((b) => b.data),
      });
    },
    answerCallback: async () => {},
    downloadTelegramFile: async () => ({
      bytes: new Uint8Array([1, 2, 3]),
      mime: "image/jpeg",
    }),
    storeEvidence: async () => "https://media.test/evidence.jpg",
    decodeQr: async () => "SKM:BOWL-1",
  };
});

const { handleSaleUpdate } = await import("@/lib/telegram/sale-flow");
const { claimUpdate, getSession } = await import("@/lib/telegram/core");

const TOKEN = "test-token";
const CHAT = "chat1";
const TG_USER = "tg-555";
const ROOM = "thamel";
const PRODUCT = "prod_bowl";
const VAR = "var_small";

let messageId = 0;
const send = (u: Partial<Parameters<typeof handleSaleUpdate>[1]>) =>
  handleSaleUpdate(TOKEN, {
    chatId: CHAT,
    telegramUserId: TG_USER,
    telegramMessageId: ++messageId,
    ...u,
  });

const lastText = () => sent[sent.length - 1]?.text ?? "";
const poolQty = () =>
  (db.stockLevels.find((l) => l.variationId === VAR)?.qty as number) ?? 0;

beforeEach(() => {
  db.staff = [
    { id: "staff1", name: "Sanu", active: true, telegramUserId: TG_USER, defaultShowroomKey: ROOM },
  ];
  db.showrooms = [
    { key: ROOM, name: "Thamel", type: "showroom", active: true, position: 0 },
    { key: "gongabu", name: "Gongabu", type: "showroom", active: true, position: 1 },
  ];
  db.products = [
    { id: PRODUCT, name: "Singing Bowl", price: 4500, sku: "SB-1", qrPayload: "SKM:BOWL-1", legacyImsCode: "BOWL-1", status: "published" },
  ];
  db.variations = [
    { id: VAR, productId: PRODUCT, sku: "SB-1-S", price: 4500, label: "Small", stock: 10, active: true, mrp: 5000 },
  ];
  db.paymentMethods = [{ id: "pm_cash", label: "Cash", active: true, channel: "cash" }];
  db.sessions = [];
  db.updates = [];
  db.sales = [];
  db.saleLines = [];
  db.saleStaff = [];
  db.stockLevels = [{ id: "lvl1", variationId: VAR, showroomKey: ROOM, qty: 10 }];
  db.stockMovements = [];
  db.counter = { id: 1, value: 0 };
  db.seq = 0;
  sent.length = 0;
  messageId = 0;
});

/** Walk the whole flow up to (not including) the confirm press. */
async function walkToConfirm() {
  await send({ text: "/sale" });
  await send({ photoFileId: "photo1" });
  await send({ callbackData: `var:${VAR}` });
  await send({ callbackData: "qty:2" });
  await send({ callbackData: "more:no" });
  await send({ callbackData: "pay:pm_cash" });
  return send({ photoFileId: "payment-photo" });
}

describe("identity", () => {
  it("records nothing for an unknown Telegram account", async () => {
    db.staff = [];
    const outcome = await send({ text: "/sale" });
    expect(outcome).toBe("unregistered");
    expect(lastText()).toMatch(/don't recognise/i);
    // No session, so nothing is half-started for a stranger.
    expect(db.sessions).toHaveLength(0);
  });

  it("refuses an inactive staff member", async () => {
    db.staff[0].active = false;
    expect(await send({ text: "/sale" })).toBe("unregistered");
    expect(lastText()).toMatch(/inactive/i);
  });

  it("asks a floater which showroom before anything is scanned", async () => {
    db.staff[0].defaultShowroomKey = null;
    expect(await send({ text: "/sale" })).toBe("sale:asked_showroom");
    expect(lastText()).toMatch(/which showroom/i);
    expect(sent[sent.length - 1].buttons).toContain(`room:${ROOM}`);

    expect(await send({ callbackData: `room:gongabu` })).toBe("sale:showroom_set");
    const session = await getSession("sales", TG_USER);
    expect(session?.showroomKey).toBe("gongabu");
  });
});

describe("dedup", () => {
  it("claims an update once, so a webhook retry is a no-op", async () => {
    const first = await claimUpdate({ bot: "sales", chatId: CHAT, telegramMessageId: 42, telegramUserId: TG_USER });
    const retry = await claimUpdate({ bot: "sales", chatId: CHAT, telegramMessageId: 42, telegramUserId: TG_USER });
    expect(first).toBe(true);
    expect(retry).toBe(false);
    expect(db.updates).toHaveLength(1);
  });

  it("treats the same message id in a different chat as a new update", async () => {
    await claimUpdate({ bot: "sales", chatId: CHAT, telegramMessageId: 7, telegramUserId: TG_USER });
    const other = await claimUpdate({ bot: "sales", chatId: "chat2", telegramMessageId: 7, telegramUserId: TG_USER });
    expect(other).toBe(true);
  });
});

describe("the /sale flow", () => {
  it("scans, picks, and builds a DRAFT that holds no stock", async () => {
    expect(await send({ text: "/sale" })).toBe("sale:started");
    expect(await send({ photoFileId: "photo1" })).toBe("sale:product_found");
    expect(lastText()).toContain("Singing Bowl");

    expect(await send({ callbackData: `var:${VAR}` })).toBe("sale:variation_picked");
    expect(await send({ callbackData: "qty:2" })).toBe("sale:item_added");
    expect(await send({ callbackData: "more:no" })).toBe("sale:items_done");
    // Decision #9: the bot asks for payment evidence outright.
    expect(await send({ callbackData: "pay:pm_cash" })).toBe("sale:payment_method_set");
    expect(lastText()).toMatch(/send a photo of the payment/i);

    expect(await send({ photoFileId: "payment-photo" })).toBe("sale:draft_created");
    expect(db.sales).toHaveLength(1);
    expect(db.sales[0].status).toBe("draft");
    expect(db.sales[0].inputSource).toBe("telegram");
    // The screenshot is retained and linked, not read and thrown away.
    expect(db.sales[0].paymentEvidenceUrl).toBe("https://media.test/evidence.jpg");
    // Nothing has left stock yet — the whole point of the draft.
    expect(poolQty()).toBe(10);
    expect(db.stockMovements).toHaveLength(0);
    expect(lastText()).toMatch(/nothing has left stock/i);
  });

  it("moves stock only when a human confirms", async () => {
    await walkToConfirm();
    expect(poolQty()).toBe(10);

    expect(await send({ callbackData: "confirm:yes" })).toBe("sale:confirmed");
    expect(db.sales[0].status).toBe("confirmed");
    expect(db.sales[0].saleNo).toBe("SL-000001");
    expect(poolQty()).toBe(8);
    expect(db.stockMovements).toHaveLength(1);
    expect(lastText()).toContain("SL-000001");
    // The session is finished, so the next /sale starts clean.
    expect(await getSession("sales", TG_USER)).toBeNull();
  });

  it("discards a draft on request, touching no stock", async () => {
    await walkToConfirm();
    expect(await send({ callbackData: "confirm:no" })).toBe("sale:discarded");
    expect(db.sales).toHaveLength(0);
    expect(poolQty()).toBe(10);
  });

  it("keeps the draft when confirming fails, rather than losing the work", async () => {
    // Only 1 in stock but 2 on the sale.
    db.stockLevels[0].qty = 1;
    await walkToConfirm();
    expect(await send({ callbackData: "confirm:yes" })).toBe("sale:confirm_failed");
    expect(lastText()).toMatch(/insufficient stock/i);
    expect(lastText()).toMatch(/still a draft/i);
    // Draft intact, stock untouched, nothing silently lost.
    expect(db.sales[0].status).toBe("draft");
    expect(poolQty()).toBe(1);
  });

  it("accepts a typed IMS code when a tag won't scan", async () => {
    await send({ text: "/sale" });
    expect(await send({ text: "BOWL-1" })).toBe("sale:product_found");
  });

  it("says so plainly when a code matches nothing", async () => {
    await send({ text: "/sale" });
    expect(await send({ text: "NOT-A-CODE" })).toBe("sale:product_not_found");
    expect(lastText()).toMatch(/nothing matches/i);
    // Still scanning, so the next attempt just works.
    expect((await getSession("sales", TG_USER))?.step).toBe("awaiting_qr");
  });

  it("batches several items before asking for payment", async () => {
    await send({ text: "/sale" });
    await send({ photoFileId: "p1" });
    await send({ callbackData: `var:${VAR}` });
    await send({ callbackData: "qty:1" });
    expect(await send({ callbackData: "more:yes" })).toBe("sale:more_items");
    await send({ photoFileId: "p2" });
    await send({ callbackData: `var:${VAR}` });
    await send({ callbackData: "qty:3" });
    await send({ callbackData: "more:no" });

    const session = await getSession("sales", TG_USER);
    expect(session?.items).toHaveLength(2);
    expect(session?.items?.reduce((s, i) => s + i.qty, 0)).toBe(4);
  });

  it("allows skipping the payment photo, but only when asked outright", async () => {
    await send({ text: "/sale" });
    await send({ photoFileId: "p1" });
    await send({ callbackData: `var:${VAR}` });
    await send({ callbackData: "qty:1" });
    await send({ callbackData: "more:no" });
    await send({ callbackData: "pay:pm_cash" });
    expect(await send({ text: "skip" })).toBe("sale:draft_created");
    expect(db.sales[0].paymentEvidenceUrl).toBeNull();
    expect(lastText()).toMatch(/no payment photo/i);
  });

  it("rejects a nonsense quantity", async () => {
    await send({ text: "/sale" });
    await send({ photoFileId: "p1" });
    await send({ callbackData: `var:${VAR}` });
    expect(await send({ text: "several" })).toBe("sale:awaiting_qty");
    expect(await send({ text: "0" })).toBe("sale:awaiting_qty");
  });

  it("refuses a product with no sellable variations", async () => {
    db.variations[0].active = false;
    await send({ text: "/sale" });
    expect(await send({ photoFileId: "p1" })).toBe("sale:no_variations");
  });
});

describe("session lifecycle", () => {
  it("tells an out-of-the-blue message what to do", async () => {
    expect(await send({ text: "hello" })).toBe("no_session");
    expect(lastText()).toMatch(/send \/sale/i);
  });

  it("cancels mid-flow and discards any draft", async () => {
    await walkToConfirm();
    expect(db.sales).toHaveLength(1);
    expect(await send({ text: "/cancel" })).toBe("cancelled");
    expect(db.sales).toHaveLength(0);
    expect(await getSession("sales", TG_USER)).toBeNull();
  });

  it("treats an expired session as no session", async () => {
    await send({ text: "/sale" });
    db.sessions[0].expiresAt = new Date(Date.now() - 1000);
    expect(await getSession("sales", TG_USER)).toBeNull();
    expect(await send({ text: "anything" })).toBe("no_session");
  });

  it("greets with instructions", async () => {
    expect(await send({ text: "/start" })).toBe("help");
    expect(lastText()).toContain("Sanu");
    expect(lastText()).toMatch(/nothing leaves stock until you confirm/i);
  });
});
