import { beforeEach, describe, expect, it, vi } from "vitest";

// Prisma's generated delegates expose heterogeneous nested payloads; this
// in-memory fake intentionally accepts those shapes at its boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const state = vi.hoisted(() => ({
  products: [] as Row[],
  levels: [] as Row[],
  movements: [] as Row[],
  orders: [] as Row[],
  events: [] as Row[],
  counter: 0,
  nextMovement: 1,
}));

function cloneState() {
  return structuredClone({
    products: state.products,
    levels: state.levels,
    movements: state.movements,
    orders: state.orders,
    events: state.events,
    counter: state.counter,
    nextMovement: state.nextMovement,
  });
}

function restore(snapshot: ReturnType<typeof cloneState>) {
  Object.assign(state, snapshot);
}

const tx = vi.hoisted(() => ({
  orderCounter: {
    upsert: vi.fn(async () => ({ id: 1, value: ++state.counter })),
  },
  order: {
    create: vi.fn(async ({ data }: Row) => {
      const order = {
        id: `order_${state.orders.length + 1}`,
        ...data,
        status: "pending",
        paymentStatus: "pending",
        items: data.items.create.map((item: Row, i: number) => ({
          id: `item_${i + 1}`,
          ...item,
        })),
        statusEvents: [data.statusEvents.create],
      };
      state.orders.push(order);
      return structuredClone(order);
    }),
    updateMany: vi.fn(async ({ where, data }: Row) => {
      const order = state.orders.find(
        (row) => row.id === where.id && row.status === where.status,
      );
      if (!order) return { count: 0 };
      Object.assign(order, data);
      return { count: 1 };
    }),
    findUniqueOrThrow: vi.fn(async ({ where }: Row) => {
      const order = state.orders.find((row) => row.id === where.id);
      if (!order) throw new Error("missing order");
      return structuredClone({ ...order, statusEvents: state.events });
    }),
  },
  orderStatusEvent: {
    create: vi.fn(async ({ data }: Row) => {
      state.events.push(data);
      return data;
    }),
  },
  productVariation: {
    findUnique: vi.fn(async ({ where }: Row) => {
      const variation = state.products[0]?.variations.find(
        (row: Row) => row.id === where.id,
      );
      return variation ? { id: variation.id } : null;
    }),
    update: vi.fn(async ({ where, data }: Row) => {
      const variation = state.products[0]?.variations.find(
        (row: Row) => row.id === where.id,
      );
      if (!variation) throw new Error("missing variation");
      variation.stock = data.stock;
      return variation;
    }),
  },
  product: {
    updateMany: vi.fn(async () => ({ count: 1 })),
  },
  showroom: {
    findUnique: vi.fn(async ({ where }: Row) =>
      ["online", "thamel"].includes(where.key) ? { key: where.key } : null,
    ),
    findMany: vi.fn(async () => [{ key: "online" }, { key: "thamel" }]),
  },
  stockLevel: {
    updateMany: vi.fn(async ({ where, data }: Row) => {
      const level = state.levels.find(
        (row) =>
          row.variationId === where.variationId &&
          row.showroomKey === where.showroomKey &&
          row.qty >= where.qty.gte,
      );
      if (!level) return { count: 0 };
      level.qty -= data.qty.decrement;
      return { count: 1 };
    }),
    findUnique: vi.fn(async ({ where }: Row) => {
      const key = where.variationId_showroomKey;
      return (
        state.levels.find(
          (row) =>
            row.variationId === key.variationId &&
            row.showroomKey === key.showroomKey,
        ) ?? null
      );
    }),
    upsert: vi.fn(async ({ where, update, create }: Row) => {
      const key = where.variationId_showroomKey;
      let level = state.levels.find(
        (row) =>
          row.variationId === key.variationId &&
          row.showroomKey === key.showroomKey,
      );
      if (level) level.qty += update.qty.increment;
      else {
        level = { id: `level_${state.levels.length + 1}`, ...create };
        state.levels.push(level as Row);
      }
      return level;
    }),
    aggregate: vi.fn(async ({ where }: Row) => ({
      _sum: {
        qty: state.levels
          .filter((row) => row.variationId === where.variationId)
          .reduce((sum, row) => sum + row.qty, 0),
      },
    })),
  },
  stockMovement: {
    create: vi.fn(async ({ data }: Row) => {
      const movement = { id: `move_${state.nextMovement++}`, ...data };
      state.movements.push(movement);
      return movement;
    }),
    findMany: vi.fn(async ({ where }: Row) =>
      state.movements.filter(
        (row) =>
          row.refType === where.refType &&
          row.refId === where.refId &&
          row.reason === where.reason &&
          row.delta < where.delta.lt,
      ),
    ),
    findFirst: vi.fn(async ({ where }: Row) =>
      state.movements.find(
        (row) => row.refType === where.refType && row.refId === where.refId,
      ) ?? null,
    ),
  },
}));

const prisma = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(async () => structuredClone(state.products)),
  },
  customer: { findUnique: vi.fn(async () => null) },
  order: {
    findUnique: vi.fn(async ({ where }: Row) => {
      const order = state.orders.find((row) => row.id === where.id);
      return order
        ? structuredClone({
            ...order,
            customer: { email: "buyer@example.com", name: "Buyer" },
          })
        : null;
    }),
  },
  $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => {
    const snapshot = cloneState();
    try {
      return await fn(tx);
    } catch (error) {
      restore(snapshot);
      throw error;
    }
  }),
}));

vi.mock("@/lib/db", () => ({ prisma }));
vi.mock("@/lib/env", () => ({ env: { NEXT_PUBLIC_SITE_URL: "https://example.com" } }));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  orderConfirmationEmail: vi.fn(() => ({})),
  orderStatusEmail: vi.fn(() => ({})),
}));
vi.mock("@/lib/dates", () => ({ adToBs: vi.fn(() => "2083-05-14") }));

const { createOrder, updateOrderStatus } = await import("@/lib/orders");

const delivery = {
  name: "Buyer",
  phone: "9800000000",
  address: "Kathmandu",
  zone: "shipping" as const,
};

function seed(online: number, thamel: number) {
  state.products = [
    {
      id: "product_1",
      slug: "bracelet",
      name: "Bracelet",
      status: "published",
      priceOnEnquiry: false,
      price: 1000,
      stockQuantity: null,
      thumbnailUrl: null,
      images: [],
      variations: [
        { id: "variation_1", sku: "BRACELET-S", price: 1000, stock: online + thamel },
      ],
    },
  ];
  state.levels = [
    { id: "level_online", variationId: "variation_1", showroomKey: "online", qty: online },
    { id: "level_thamel", variationId: "variation_1", showroomKey: "thamel", qty: thamel },
  ];
  state.movements = [];
  state.orders = [];
  state.events = [];
  state.counter = 0;
  state.nextMovement = 1;
  vi.clearAllMocks();
}

describe("online order stock ledger", () => {
  beforeEach(() => seed(6, 4));

  it("debits Online, appends an Order movement, and keeps aggregate stock derived", async () => {
    const order = await createOrder(
      "customer_1",
      [{ productId: "product_1", variationId: "variation_1", quantity: 2 }],
      delivery,
    );

    expect(state.levels.find((row) => row.showroomKey === "online")?.qty).toBe(4);
    expect(state.levels.find((row) => row.showroomKey === "thamel")?.qty).toBe(4);
    expect(state.products[0].variations[0].stock).toBe(8);
    expect(state.movements).toMatchObject([
      {
        variationId: "variation_1",
        showroomKey: "online",
        delta: -2,
        reason: "order",
        refType: "Order",
        refId: order.id,
      },
    ]);
  });

  it("rejects on a short Online pool even when aggregate showroom stock is sufficient", async () => {
    seed(1, 9);
    await expect(
      createOrder(
        "customer_1",
        [{ productId: "product_1", variationId: "variation_1", quantity: 2 }],
        delivery,
      ),
    ).rejects.toMatchObject({ statusCode: 422 });

    expect(state.orders).toHaveLength(0);
    expect(state.movements).toHaveLength(0);
    expect(state.levels.find((row) => row.showroomKey === "online")?.qty).toBe(1);
    expect(state.counter).toBe(0);
  });

  it("cancellation reverses the exact original debit once", async () => {
    const order = await createOrder(
      "customer_1",
      [{ productId: "product_1", variationId: "variation_1", quantity: 2 }],
      delivery,
    );
    await updateOrderStatus(order.id, "cancelled", { actor: "owner@example.com" });

    expect(state.levels.find((row) => row.showroomKey === "online")?.qty).toBe(6);
    expect(state.movements).toHaveLength(2);
    expect(state.movements[1]).toMatchObject({
      showroomKey: "online",
      delta: 2,
      reason: "correction",
      refType: "StockMovement",
      refId: state.movements[0].id,
    });

    await expect(
      updateOrderStatus(order.id, "cancelled", { actor: "owner@example.com" }),
    ).rejects.toThrow(/cannot move/i);
    expect(state.movements).toHaveLength(2);
  });

  it("rolls cancellation back when the original Online debit is missing", async () => {
    const order = await createOrder(
      "customer_1",
      [{ productId: "product_1", variationId: "variation_1", quantity: 2 }],
      delivery,
    );
    state.movements = [];

    await expect(
      updateOrderStatus(order.id, "cancelled", { actor: "owner@example.com" }),
    ).rejects.toThrow(/no matching Online stock debit/i);
    expect(state.orders[0].status).toBe("pending");
    expect(state.levels.find((row) => row.showroomKey === "online")?.qty).toBe(4);
  });
});
