// Delivery must only imply payment for COD.
//
// updateOrderStatus() has always set paymentStatus:"completed" when an order
// reaches "delivered" — correct while COD was the only method, because the
// cash changes hands at the door. Once prepaid Fonepay orders exist that rule
// silently books a FAILED payment as paid the moment an admin marks the parcel
// delivered. These tests pin the distinction.

import { describe, expect, it, beforeEach, vi } from "vitest";

interface OrderRow {
  id: string;
  number: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  items: unknown[];
  customer: { email: string; name: string };
}

let order: OrderRow;

const client = {
  order: {
    findUnique: async () => ({ ...order }),
    findUniqueOrThrow: async () => ({ ...order, statusEvents: [] }),
    updateMany: async ({
      where,
      data,
    }: {
      where: { id: string; status: string };
      data: Partial<OrderRow>;
    }) => {
      if (order.id !== where.id || order.status !== where.status) return { count: 0 };
      Object.assign(order, data);
      return { count: 1 };
    },
  },
  orderStatusEvent: { create: async () => ({}) },
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
    items: [],
    customer: { email: "buyer@example.com", name: "Buyer" },
  };
}

beforeEach(() => {
  order = makeOrder("cod");
});

describe("delivery vs payment", () => {
  it("marks a COD order paid on delivery — cash at the door", async () => {
    await updateOrderStatus("order_1", "delivered", { actor: "admin@test" });
    expect(order.status).toBe("delivered");
    expect(order.paymentStatus).toBe("completed");
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
