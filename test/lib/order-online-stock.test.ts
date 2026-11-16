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
  txns: [] as Row[],
  sales: [] as Row[],
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
    sales: state.sales,
    counter: state.counter,
    nextMovement: state.nextMovement,
  });
}

function restore(snapshot: ReturnType<typeof cloneState>) {
  Object.assign(state, snapshot);
}

const tx = vi.hoisted(() => ({
  // applyMovement's `SELECT … FOR NO KEY UPDATE` row lock on the variation.
  $queryRaw: vi.fn(async (_sql: TemplateStringsArray, id: string) =>
    (state.products[0]?.variations ?? [])
      .filter((row: Row) => row.id === id)
      .map((row: Row) => ({ id: row.id })),
  ),
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
    // Plain equality plus `{ not }`, as the status and payment guards use.
    updateMany: vi.fn(async ({ where, data }: Row) => {
      const order = state.orders.find((row) =>
        Object.entries(where).every(([k, v]) =>
          v && typeof v === "object" ? row[k] !== (v as Row).not : row[k] === v,
        ),
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
  // Sales spine, just enough for the paid-order bridge and its void.
  saleCounter: { upsert: vi.fn(async () => ({ value: state.sales.length + 1 })) },
  sale: {
    findUnique: vi.fn(async ({ where }: Row) => {
      const [k, v] = Object.entries(where)[0];
      return structuredClone(state.sales.find((row) => row[k] === v) ?? null);
    }),
    create: vi.fn(async ({ data }: Row) => {
      const sale = {
        id: `sale_${state.sales.length + 1}`,
        ...data,
        lines: data.lines?.createMany.data ?? [],
        staff: [],
      };
      state.sales.push(sale);
      return structuredClone(sale);
    }),
    update: vi.fn(async ({ where, data }: Row) => {
      const sale = state.sales.find((row) => row.id === where.id)!;
      Object.assign(sale, data);
      return structuredClone(sale);
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
  // Honours its where clause like Postgres: an untracked (null) product or a
  // short one matches nothing.
  product: {
    updateMany: vi.fn(async ({ where, data }: Row) => {
      const product = state.products.find((row) => row.id === where.id);
      const q = product?.stockQuantity;
      if (!product || q == null) return { count: 0 };
      if (where.stockQuantity?.gte !== undefined && q < where.stockQuantity.gte) {
        return { count: 0 };
      }
      product.stockQuantity =
        q - (data.stockQuantity.decrement ?? 0) + (data.stockQuantity.increment ?? 0);
      return { count: 1 };
    }),
  },
  orderItem: {
    updateMany: vi.fn(async ({ where, data }: Row) => {
      const item = state.orders
        .flatMap((order) => order.items)
        .find((row: Row) => row.id === where.id && row.stockDebited === where.stockDebited);
      if (!item) return { count: 0 };
      Object.assign(item, data);
      return { count: 1 };
    }),
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
    // Only the unpaid-order sweep lists orders.
    findMany: vi.fn(async ({ where }: Row) =>
      state.orders
        .filter(
          (row) =>
            row.status === where.status &&
            row.paymentMethod === where.paymentMethod &&
            row.paymentStatus === where.paymentStatus &&
            row.createdAt < where.createdAt.lt &&
            !state.txns.some(
              (t) =>
                t.orderId === row.id &&
                Object.entries(where.paymentTransactions?.none ?? {}).every(([k, v]) =>
                  k === "createdAt"
                    ? (t.createdAt ?? new Date(0)) >= (v as { gte: Date }).gte
                    : t[k] === v,
                ),
            ),
        )
        .map((row) => ({
          id: row.id,
          number: row.number,
          total: row.total,
          paymentTransactions: state.txns.filter(
            (t) => t.orderId === row.id && t.status === "pending" && !t.verified,
          ),
        })),
    ),
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
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "https://example.com",
    FONEPAY_BASE_URL: "",
    FONEPAY_USERNAME: "",
    FONEPAY_PASSWORD: "",
    FONEPAY_PRIVATE_KEY: "",
    FONEPAY_TERMINAL_ID: "",
  },
}));
vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  orderConfirmationEmail: vi.fn(() => ({})),
  orderStatusEmail: vi.fn(() => ({})),
}));
vi.mock("@/lib/dates", () => ({ adToBs: vi.fn(() => "2083-05-14") }));

const { createOrder, updateOrderStatus, expireUnpaidOrders } = await import("@/lib/orders");
const { markOrderPaid } = await import("@/lib/payment/settle");

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
        { id: "variation_1", sku: "BRACELET-S", price: 1000, stock: online + thamel, active: true },
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
  state.txns = [];
  state.sales = [];
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

  it("refuses a variant product ordered without a variation, or with a retired one", async () => {
    await expect(
      createOrder("customer_1", [{ productId: "product_1", quantity: 1 }], delivery),
    ).rejects.toMatchObject({ statusCode: 400 });

    state.products[0].variations[0].active = false;
    await expect(
      createOrder(
        "customer_1",
        [{ productId: "product_1", variationId: "variation_1", quantity: 1 }],
        delivery,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(state.orders).toHaveLength(0);
    expect(state.movements).toHaveLength(0);
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

  describe("product-level stock (no variations)", () => {
    function seedPlain(stockQuantity: number | null) {
      state.products = [
        {
          id: "product_2",
          slug: "incense",
          name: "Incense",
          status: "published",
          priceOnEnquiry: false,
          price: 300,
          stockQuantity,
          thumbnailUrl: null,
          images: [],
          variations: [],
        },
      ];
    }

    it("refuses an order the product can't cover", async () => {
      seedPlain(1);
      await expect(
        createOrder("customer_1", [{ productId: "product_2", quantity: 2 }], delivery),
      ).rejects.toMatchObject({ statusCode: 422 });
      expect(state.products[0].stockQuantity).toBe(1);
    });

    it("cancel restores only stock the order actually took (audit #6)", async () => {
      seedPlain(null); // untracked at checkout: nothing is taken
      const order = await createOrder(
        "customer_1",
        [{ productId: "product_2", quantity: 2 }],
        delivery,
      );
      state.products[0].stockQuantity = 5; // tracking switched on later
      await updateOrderStatus(order.id, "cancelled", { actor: "owner@example.com" });
      expect(state.products[0].stockQuantity).toBe(5);
    });

    it("cancel gives back a tracked product's stock exactly once", async () => {
      seedPlain(5);
      const order = await createOrder(
        "customer_1",
        [{ productId: "product_2", quantity: 2 }],
        delivery,
      );
      expect(state.products[0].stockQuantity).toBe(3);
      await updateOrderStatus(order.id, "cancelled", { actor: "owner@example.com" });
      expect(state.products[0].stockQuantity).toBe(5);
      expect(state.orders[0].items[0].stockDebited).toBe(false);
    });
  });

  describe("unpaid Fonepay orders expire (audit #5)", () => {
    async function fonepayOrder(minutesAgo: number) {
      const order = await createOrder(
        "customer_1",
        [{ productId: "product_1", variationId: "variation_1", quantity: 2 }],
        delivery,
        "fonepay",
      );
      state.orders[0].createdAt = new Date(Date.now() - minutesAgo * 60_000);
      return order;
    }

    it("cancels a stale unpaid order and puts its Online stock back", async () => {
      await fonepayOrder(61);
      expect(state.levels.find((row) => row.showroomKey === "online")?.qty).toBe(4);

      expect(await expireUnpaidOrders(60)).toBe(1);
      expect(state.orders[0].status).toBe("cancelled");
      expect(state.levels.find((row) => row.showroomKey === "online")?.qty).toBe(6);
    });

    it("leaves a recent order, and one with a payment attempt it can't verify", async () => {
      await fonepayOrder(10);
      expect(await expireUnpaidOrders(60)).toBe(0);

      state.orders[0].createdAt = new Date(Date.now() - 61 * 60_000);
      state.txns = [{ orderId: state.orders[0].id, status: "pending", verified: false }];
      // Fonepay isn't configured here, so the attempt can't be checked: a
      // possibly-paid order must not be cancelled on a guess.
      expect(await expireUnpaidOrders(60)).toBe(0);
      expect(state.orders[0].status).toBe("pending");
    });
  });

  it("a paid order becomes one online sale, voided (without stock moves) on cancel (audit #8)", async () => {
    const order = await createOrder(
      "customer_1",
      [{ productId: "product_1", variationId: "variation_1", quantity: 2 }],
      delivery,
      "fonepay",
    );
    await prisma.$transaction((t) => markOrderPaid(t as never, order.id));
    await prisma.$transaction((t) => markOrderPaid(t as never, order.id));
    expect(state.sales).toHaveLength(1);
    expect(state.sales[0]).toMatchObject({ channel: "online", status: "confirmed", totalAmount: 2000 });
    expect(state.movements).toHaveLength(1); // only the checkout debit

    await updateOrderStatus(order.id, "cancelled", { actor: "owner@example.com" });
    expect(state.orders[0].paymentStatus).toBe("refund_owed");
    expect(state.sales[0].status).toBe("void");
    expect(state.sales[1]).toMatchObject({ reversesSaleId: state.sales[0].id, totalAmount: -2000 });
    // The order's own cancel restores the Online pool; the sale void adds nothing.
    expect(state.levels.find((row) => row.showroomKey === "online")?.qty).toBe(6);
    expect(state.movements).toHaveLength(2);
  });
});
