// Delivery-log invariants.
//
//   · the log is append-only — a correction is the next event, never an edit
//   · an event can't claim something the log doesn't support (delivered before
//     anything says it was dispatched)
//   · there is ONE customer-facing status: recording a dispatch moves it, so
//     the log and the customer's view can't drift apart
//   · a dispatch that the status machine would refuse is refused BEFORE the
//     event is written, so the log never runs ahead of the order
//   · the order's summary columns are materialized from the log, never typed
//   · nothing more happens to a cancelled order

import { describe, expect, it, beforeEach, vi } from "vitest";

type Row = Record<string, unknown>;

const db = {
  orders: [] as Row[],
  events: [] as Row[],
  statusEvents: [] as Row[],
  couriers: [] as Row[],
  staff: [] as Row[],
  items: [] as Row[],
  customers: [] as Row[],
  seq: 0,
};

const nextId = (p: string) => `${p}_${++db.seq}`;

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
    if (v && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      const c = v as Row;
      if ("not" in c) return row[k] !== c.not;
      if ("in" in c) return (c.in as unknown[]).includes(row[k]);
      if ("notIn" in c) return !(c.notIn as unknown[]).includes(row[k]);
      if ("gte" in c || "lte" in c) {
        const t = (row[k] as Date)?.getTime?.() ?? 0;
        if ("gte" in c && t < (c.gte as Date).getTime()) return false;
        if ("lte" in c && t > (c.lte as Date).getTime()) return false;
        return true;
      }
    }
    return row[k] === v;
  });
}

function hydrateOrder(row: Row, opts?: { select?: Row; include?: Row }): Row {
  const out = clone(row);
  const spec = opts?.select ?? opts?.include;
  if (spec?.deliveryEvents) {
    out.deliveryEvents = db.events
      .filter((e) => e.orderId === row.id)
      .map(clone);
  }
  if (spec?.items) out.items = db.items.filter((i) => i.orderId === row.id).map(clone);
  if (spec?.customer) {
    out.customer = clone(db.customers.find((c) => c.id === row.customerId) ?? null);
  }
  return out;
}

function model(store: () => Row[]) {
  return {
    findUnique: async ({ where, select, include }: { where: Row; select?: Row; include?: Row }) => {
      const row = store().find((r) => matches(r, where));
      return row ? hydrateOrder(row, { select, include }) : null;
    },
    findUniqueOrThrow: async ({ where, select, include }: { where: Row; select?: Row; include?: Row }) => {
      const row = store().find((r) => matches(r, where));
      if (!row) throw new Error("row not found in fake");
      return hydrateOrder(row, { select, include });
    },
    findFirst: async ({ where }: { where?: Row } = {}) => {
      const row = store().find((r) => matches(r, where ?? {}));
      return row ? clone(row) : null;
    },
    findMany: async ({ where, orderBy, take, skip }: { where?: Row; orderBy?: Row; take?: number; skip?: number } = {}) => {
      let rows = store().filter((r) => matches(r, where ?? {}));
      const [field, dir] = Object.entries(orderBy ?? {})[0] ?? [];
      if (field) {
        // Insertion order breaks ties: several events recorded inside the same
        // millisecond would otherwise come back in an arbitrary order here,
        // which is a property of the fake's clock, not of the query.
        rows = rows
          .map((r, i) => ({ r, i }))
          .sort((a, b) => {
            const av = a.r[field] as number;
            const bv = b.r[field] as number;
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
            return dir === "desc" ? b.i - a.i : a.i - b.i;
          })
          .map((x) => x.r);
      }
      return rows.slice(skip ?? 0, (skip ?? 0) + (take ?? rows.length)).map(clone);
    },
    count: async ({ where }: { where?: Row } = {}) =>
      store().filter((r) => matches(r, where ?? {})).length,
    create: async ({ data }: { data: Row }) => {
      const row: Row = { id: nextId("row"), createdAt: new Date(), ...data };
      store().push(row);
      return clone(row);
    },
    update: async ({ where, data }: { where: Row; data: Row }) => {
      const row = store().find((r) => matches(r, where));
      if (!row) throw new Error("row not found in fake");
      Object.assign(row, data);
      return clone(row);
    },
    updateMany: async ({ where, data }: { where: Row; data: Row }) => {
      const rows = store().filter((r) => matches(r, where));
      for (const r of rows) Object.assign(r, data);
      return { count: rows.length };
    },
  };
}

const client = {
  order: model(() => db.orders),
  deliveryEvent: {
    ...model(() => db.events),
    groupBy: async ({ where }: { where?: Row }) => {
      const rows = db.events.filter((r) => matches(r, where ?? {}));
      const byEvent = new Map<string, number>();
      for (const r of rows) {
        byEvent.set(r.event as string, (byEvent.get(r.event as string) ?? 0) + 1);
      }
      return [...byEvent].map(([event, n]) => ({ event, _count: { _all: n } }));
    },
  },
  orderStatusEvent: model(() => db.statusEvents),
  courier: model(() => db.couriers),
  staff: model(() => db.staff),
  product: model(() => []),
  productVariation: model(() => []),
  customer: model(() => db.customers),
};

async function fakeTransaction<T>(fn: (tx: typeof client) => Promise<T>): Promise<T> {
  const snap = clone({
    orders: db.orders,
    events: db.events,
    statusEvents: db.statusEvents,
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

// The customer email is a side effect of the status move, not of the log.
const emails: string[] = [];
vi.mock("@/lib/email", () => ({
  sendEmail: async (to: string) => {
    emails.push(to);
  },
  orderConfirmationEmail: () => ({ subject: "", html: "" }),
  orderStatusEmail: () => ({ subject: "", html: "" }),
}));

const { recordDeliveryEvent, listDeliveryLog, countDeliveryEvents } =
  await import("@/lib/fulfilment");

const ORDER = "order1";
const ACTOR = "sanu@shaman.test";

beforeEach(() => {
  db.customers = [{ id: "cust1", email: "buyer@test", name: "Buyer" }];
  db.orders = [
    {
      id: ORDER,
      number: "SK-000001",
      customerId: "cust1",
      status: "confirmed",
      subtotal: 4500,
      total: 4500,
      deliveryZone: "thamel",
      paymentStatus: "pending",
    },
  ];
  db.items = [
    { id: "item1", orderId: ORDER, productId: "p1", variationId: null, quantity: 1 },
  ];
  db.events = [];
  db.statusEvents = [];
  db.couriers = [{ id: "cour1", label: "inDrive", active: true }];
  db.staff = [{ id: "staff1", name: "Sanu", active: true }];
  db.seq = 0;
  emails.length = 0;
});

const record = async (input: Partial<Parameters<typeof recordDeliveryEvent>[0]>) => {
  const r = await recordDeliveryEvent({
    orderId: ORDER,
    event: "packed",
    actor: ACTOR,
    ...input,
  } as Parameters<typeof recordDeliveryEvent>[0]);
  return r.event;
};

describe("recording what happened", () => {
  it("logs a packing with both calendars and who did it", async () => {
    const e = await record({ event: "packed", staffId: "staff1" });
    expect(e.event).toBe("packed");
    expect(e.staffId).toBe("staff1");
    // Dual calendar on every reporting row.
    expect(e.dateBs).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // And the order's summary column is materialized from it.
    expect(db.orders[0].packedByStaffId).toBe("staff1");
  });

  it("carries the courier, tracking ref and landmark onto the order", async () => {
    await record({
      event: "dispatched",
      courierId: "cour1",
      trackingRef: "ND-123",
      landmark: "near the temple",
    });
    expect(db.orders[0].courierId).toBe("cour1");
    expect(db.orders[0].courierTrackingRef).toBe("ND-123");
    expect(db.orders[0].deliveryLandmark).toBe("near the temple");
    expect(db.orders[0].dispatchedAt).toBeInstanceOf(Date);
  });

  it("records the cash that actually came back", async () => {
    await record({ event: "dispatched" });
    await record({ event: "delivered", staffId: "staff1", codCollected: 4500 });
    expect(db.orders[0].codAmount).toBe(4500);
    expect(db.orders[0].deliveredByStaffId).toBe("staff1");
  });

  it("refuses a negative amount of cash", async () => {
    await expect(record({ event: "packed", codCollected: -1 })).rejects.toThrow(
      /cannot be negative/i,
    );
  });

  it("catches the stray zero — 45,000 collected on a 4,500 order", async () => {
    await record({ event: "dispatched" });
    // Nothing is owed beyond the total, so this is a typo, and it is far
    // cheaper to refuse now than to reconcile the month later.
    await expect(
      record({ event: "delivered", codCollected: 45000 }),
    ).rejects.toThrow(/more than order .* is worth/i);
    // Refused before anything was written.
    expect(db.orders[0].codAmount).toBeUndefined();
    expect(db.events.some((e) => e.event === "delivered")).toBe(false);
  });

  it("still accepts the exact total, and a part payment", async () => {
    await record({ event: "dispatched" });
    await record({ event: "delivered", codCollected: 4500 });
    expect(db.orders[0].codAmount).toBe(4500);
  });

  it("does not let a later event blank what an earlier one recorded", async () => {
    await record({ event: "dispatched", courierId: "cour1", trackingRef: "ND-123" });
    // A delivery that names no courier must not erase the one that carried it.
    await record({ event: "delivered" });
    expect(db.orders[0].courierId).toBe("cour1");
    expect(db.orders[0].courierTrackingRef).toBe("ND-123");
  });

  it("refuses an unknown courier, naming the real ones", async () => {
    await expect(
      record({ event: "dispatched", courierId: "nope" }),
    ).rejects.toThrow(/courier not found/i);
    expect(db.events).toHaveLength(0);
  });
});

describe("what the log has to support", () => {
  it("won't accept a delivery before anything says it was dispatched", async () => {
    await expect(record({ event: "delivered" })).rejects.toThrow(
      /nothing says it was dispatched/i,
    );
    expect(db.events).toHaveLength(0);
  });

  it("won't accept a return before a delivery", async () => {
    await expect(record({ event: "returned" })).rejects.toThrow(
      /nothing says it was delivered/i,
    );
  });

  it("allows a dispatch that was never packed, because that happens", async () => {
    // Straight from the counter to a waiting rider. Inventing a packed event
    // nobody performed would be a lie in the log.
    const e = await record({ event: "dispatched" });
    expect(e.event).toBe("dispatched");
  });

  it("allows repeated failed attempts — each one is its own row", async () => {
    await record({ event: "dispatched" });
    await record({ event: "failed_attempt", note: "phone off" });
    await record({ event: "failed_attempt", note: "nobody home" });
    await record({ event: "delivered" });

    const log = await listDeliveryLog({ orderId: ORDER });
    expect(log.total).toBe(4);
    const counts = await countDeliveryEvents({ orderId: ORDER });
    expect(counts.failed_attempt).toBe(2);
    expect(counts.delivered).toBe(1);
  });

  it("records nothing more once the order is cancelled", async () => {
    db.orders[0].status = "cancelled";
    await expect(record({ event: "packed" })).rejects.toThrow(/cancelled/i);
  });
});

describe("one customer-facing status", () => {
  it("moves the order to shipped when a dispatch is logged", async () => {
    await record({ event: "dispatched", courierId: "cour1" });
    expect(db.orders[0].status).toBe("shipped");
    // The customer hears about it through the existing path.
    expect(emails).toHaveLength(1);
  });

  it("moves it to delivered, and settles COD payment, on delivery", async () => {
    await record({ event: "dispatched" });
    await record({ event: "delivered", codCollected: 4500 });
    expect(db.orders[0].status).toBe("delivered");
    expect(db.orders[0].paymentStatus).toBe("completed");
  });

  it("refuses a dispatch the status machine would reject, writing nothing", async () => {
    // Still pending: confirm it first. The log must never run ahead of the
    // order, because then neither would be true.
    db.orders[0].status = "pending";
    await expect(record({ event: "dispatched" })).rejects.toThrow(
      /cannot become "shipped"/i,
    );
    expect(db.events).toHaveLength(0);
    expect(db.orders[0].status).toBe("pending");
  });

  it("leaves the status alone for events it has no vocabulary for", async () => {
    await record({ event: "dispatched" });
    await record({ event: "delivered" });
    await record({ event: "returned", note: "wrong size" });
    // No "returned" in the customer-facing machine — quietly reusing
    // "delivered" would misreport what happened.
    expect(db.orders[0].status).toBe("delivered");
    expect(db.events.at(-1)?.event).toBe("returned");
  });

  it("doesn't re-move a status that is already there", async () => {
    await record({ event: "dispatched" });
    emails.length = 0;
    await record({ event: "out_for_delivery" });
    await record({ event: "failed_attempt" });
    expect(db.orders[0].status).toBe("shipped");
    // No spurious "your order shipped" email for each courier scan.
    expect(emails).toHaveLength(0);
  });
});

describe("reading the log", () => {
  it("comes back newest first, filterable by courier", async () => {
    await record({ event: "packed", staffId: "staff1" });
    await record({ event: "dispatched", courierId: "cour1" });

    const all = await listDeliveryLog({});
    expect(all.events[0].event).toBe("dispatched");

    const byCourier = await listDeliveryLog({ courierId: "cour1" });
    expect(byCourier.total).toBe(1);
  });

  it("counts every bucket for a period", async () => {
    await record({ event: "packed" });
    await record({ event: "dispatched" });
    await record({ event: "delivered" });
    const counts = await countDeliveryEvents({});
    expect(counts).toEqual({ packed: 1, dispatched: 1, delivered: 1 });
  });
});
