// Delivery must only imply payment for COD.
//
// updateOrderStatus() has always set paymentStatus:"completed" when an order
// reaches "delivered" — correct while COD was the only method, because the
// cash changes hands at the door. Once prepaid Fonepay orders exist that rule
// silently books a FAILED payment as paid the moment an admin marks the parcel
// delivered. These tests pin the distinction.

import { describe, expect, it, beforeEach, vi } from "vitest";
import { PAYMENT_METHOD_LABEL } from "@/lib/orders/payment-display";

interface OrderRow {
  id: string;
  number: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  codAmount: number | null;
  items: unknown[];
  customer: { email: string; name: string };
}

let order: OrderRow;

const client = {
  order: {
    findUnique: async () => ({ ...order }),
    findUniqueOrThrow: async () => ({ ...order, statusEvents: [] }),
    // Honours plain equality and `{ not }` filters, as the guarded writes need.
    updateMany: async ({
      where,
      data,
    }: {
      where: Record<string, unknown>;
      data: Partial<OrderRow>;
    }) => {
      const row = order as unknown as Record<string, unknown>;
      const ok = Object.entries(where).every(([k, v]) =>
        v && typeof v === "object" && "not" in v
          ? row[k] !== (v as { not: unknown }).not
          : row[k] === v,
      );
      if (!ok) return { count: 0 };
      Object.assign(order, data);
      return { count: 1 };
    },
  },
  orderStatusEvent: { create: async () => ({}) },
  stockMovement: { findMany: async () => [] },
  productVariation: { updateMany: async () => ({ count: 0 }) },
  product: { updateMany: async () => ({ count: 0 }) },
};

const fakeTransaction = async (fn: (tx: typeof client) => Promise<unknown>) => fn(client);

vi.mock("@/lib/db", () => ({ prisma: { ...client, $transaction: fakeTransaction } }));
vi.mock("@/lib/email", () => ({
  sendEmail: async () => {},
  orderStatusEmail: () => ({ subject: "", html: "", text: "" }),
  orderConfirmationEmail: () => ({ subject: "", html: "", text: "" }),
}));

const { updateOrderStatus } = await import("@/lib/orders");

function makeOrder(paymentMethod: string, paymentStatus = "pending"): OrderRow {
  return {
    id: "order_1",
    number: "SK-000042",
    status: "shipped",
    paymentMethod,
    paymentStatus,
    total: 4500,
    codAmount: null,
    items: [],
    customer: { email: "buyer@example.com", name: "Buyer" },
  };
}

beforeEach(() => {
  order = makeOrder("cod");
});

describe("delivery vs payment", () => {
  it("marks a COD order paid on delivery when the cash collected covers it", async () => {
    order.codAmount = 4500;
    const result = await updateOrderStatus("order_1", "delivered", { actor: "admin@test" });
    expect(order.status).toBe("delivered");
    expect(order.paymentStatus).toBe("completed");
    expect(result.paymentWarning).toBeNull();
  });

  // Delivery alone is not evidence the cash was collected (audit #7).
  it("leaves COD pending, with a warning, when no or short cash is recorded", async () => {
    for (const codAmount of [null, 4000]) {
      order = { ...makeOrder("cod"), codAmount };
      const result = await updateOrderStatus("order_1", "delivered", { actor: "admin@test" });
      expect(order.status).toBe("delivered");
      expect(order.paymentStatus).toBe("pending");
      expect(result.paymentWarning).toMatch(/payment left pending/i);
    }
  });

  it("does NOT mark an unpaid fonepay order paid on delivery", async () => {
    order = makeOrder("fonepay");
    await updateOrderStatus("order_1", "delivered", { actor: "admin@test" });
    expect(order.status).toBe("delivered");
    // The gateway never confirmed this one — delivering the parcel is not
    // evidence that the customer paid for it.
    expect(order.paymentStatus).toBe("pending");
  });

  it("leaves an already-settled fonepay order paid", async () => {
    order = makeOrder("fonepay", "completed");
    await updateOrderStatus("order_1", "delivered", { actor: "admin@test" });
    expect(order.paymentStatus).toBe("completed");
  });
});

// The guard must be an ALLOWLIST ("is cod"), never a denylist ("is not
// fonepay"). Both shapes satisfy the three cases above, but a denylist puts
// the money bug straight back for every OTHER prepaid method — and the admin
// vocabulary already names esewa, khalti and bank alongside fonepay. This
// table walks every non-cod method the product knows about, so the day one of
// them is wired up it is already covered.
describe("only cash-on-delivery may settle itself", () => {
  const prepaid = Object.keys(PAYMENT_METHOD_LABEL).filter((m) => m !== "cod");

  // Without this the loop below would assert nothing at all if the vocabulary
  // were ever emptied or renamed.
  it("has prepaid methods to check", () => {
    expect(prepaid.length).toBeGreaterThan(0);
    expect(prepaid).toContain("fonepay");
  });

  for (const method of prepaid) {
    it(`does not mark a ${method} order paid on delivery`, async () => {
      order = makeOrder(method);
      await updateOrderStatus("order_1", "delivered", { actor: "admin@test" });
      expect(order.status).toBe("delivered");
      expect(order.paymentStatus).toBe("pending");
    });
  }

  // A method nobody has defined yet must also fail closed: an unrecognised
  // value is the one case where guessing "probably cash" costs real money.
  it("does not mark an unrecognised payment method paid on delivery", async () => {
    order = makeOrder("some-future-wallet");
    await updateOrderStatus("order_1", "delivered", { actor: "admin@test" });
    expect(order.paymentStatus).toBe("pending");
  });
});

// Audit #2: a paid order may still be cancelled, but never silently — the
// money is then owed back, and the guard includes paymentStatus so a settle
// racing the cancel can't slip between the read and the write.
describe("cancelling a paid order", () => {
  it("records refund owed instead of leaving it looking paid", async () => {
    order = { ...makeOrder("fonepay", "completed"), status: "confirmed" };
    await updateOrderStatus("order_1", "cancelled", { actor: "admin@test" });
    expect(order.status).toBe("cancelled");
    expect(order.paymentStatus).toBe("refund_owed");
  });

  it("an unpaid order cancels with payment untouched", async () => {
    order = { ...makeOrder("fonepay"), status: "confirmed" };
    await updateOrderStatus("order_1", "cancelled", { actor: "admin@test" });
    expect(order.paymentStatus).toBe("pending");
  });
});
