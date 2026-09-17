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
  paymentStatus: string;
  deliveryPhone: string;
  items: unknown[];
}
interface TxnRow {
  id: string;
  orderId: string;
  referenceLabel: string;
  status: string;
  verified: boolean;
  fonepayTraceId: string | null;
  rawStatusPayload: unknown;
  errorMessage: string | null;
}

const db = {
  order: null as OrderRow | null,
  txn: null as TxnRow | null,
};

function resetDb() {
  db.order = {
    id: "order_1",
    number: "SK-000042",
    customerId: "cust_1",
    total: 4500,
    paymentStatus: "pending",
    deliveryPhone: "9800000000",
    items: [],
  };
  db.txn = {
    id: "txn_1",
    orderId: "order_1",
    referenceLabel: "SK000042A1",
    status: "pending",
    verified: false,
    fonepayTraceId: null,
    rawStatusPayload: null,
    errorMessage: null,
  };
}

const client = {
  order: {
    findFirst: async ({ where }: { where: { number: string; customerId: string } }) =>
      db.order &&
      db.order.number === where.number &&
      db.order.customerId === where.customerId
        ? { ...db.order }
        : null,
    update: async ({ data }: { data: Partial<OrderRow> }) => {
      Object.assign(db.order!, data);
      return { ...db.order! };
    },
  },
  paymentTransaction: {
    findFirst: async ({ where }: { where: { orderId: string; referenceLabel: string } }) =>
      db.txn &&
      db.txn.orderId === where.orderId &&
      db.txn.referenceLabel === where.referenceLabel
        ? { ...db.txn }
        : null,
    update: async ({ data }: { data: Partial<TxnRow> }) => {
      Object.assign(db.txn!, data);
      return { ...db.txn! };
    },
    // The exactly-once guard: honour `verified: false` in the filter exactly
    // as Postgres would, so a second caller matches zero rows.
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; verified?: boolean };
      data: Partial<TxnRow>;
    }) => {
      if (!db.txn || db.txn.id !== where.id) return { count: 0 };
      if (where.verified !== undefined && db.txn.verified !== where.verified) {
        return { count: 0 };
      }
      Object.assign(db.txn, data);
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

function call() {
  return POST(
    new Request("https://www.shamankathmandu.com/api/customer/payment/fonepay/status", {
      method: "POST",
      body: JSON.stringify({ orderNumber: "SK-000042", referenceLabel: "SK000042A1" }),
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
    expect(db.txn!.verified).toBe(true);
    expect(db.txn!.status).toBe("success");
    expect(db.txn!.fonepayTraceId).toBe("TRACE-1");
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
    expect(db.txn!.verified).toBe(true);
    // The whole point: only the caller that won the flip fires the side effects.
    expect(purchases).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledTimes(1);
  });

  it("does NOT settle when Fonepay reports a different amount (409)", async () => {
    getPaymentStatus.mockResolvedValue(success(450)); // a decimal-point slip

    const res = await call();

    expect(res.status).toBe(409);
    expect(db.order!.paymentStatus).toBe("pending");
    expect(db.txn!.verified).toBe(false);
    expect(db.txn!.errorMessage).toContain("Amount mismatch");
    expect(purchases).not.toHaveBeenCalled();
  });

  it("does NOT settle when the gateway is unreachable (502)", async () => {
    getPaymentStatus.mockRejectedValue(new Error("Fonepay request failed: timeout"));

    const res = await call();

    expect(res.status).toBe(502);
    expect(db.order!.paymentStatus).toBe("pending");
    expect(db.txn!.verified).toBe(false);
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
    expect(db.txn!.status).toBe("failed");
    expect(db.txn!.errorMessage).toBe("cancelled by user");
    expect(purchases).not.toHaveBeenCalled();
  });

  it("short-circuits an already-completed order without calling Fonepay again", async () => {
    db.order!.paymentStatus = "completed";

    const res = await call();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ paid: true });
    expect(getPaymentStatus).not.toHaveBeenCalled();
  });
});
