// HIVE-124 — tri-state update semantics for variation fields.
//
// THE ARMED SCENARIO this exists to prevent: updateProduct() retires a dropped
// variation (active=false) instead of deleting it *when it has StockMovement
// rows*. Production has zero movement rows today, so that branch has never
// fired and no variation has ever been retired. The reporting rollout fills the
// ledger — and on that day a later sloppy update_product call that omits
// `active` would silently resurrect a retired variation as sellable stock,
// because Zod's `.default(true)` manufactured a value for the absent key.
//
// The same collapse blanked `label/color/size/dimensions/mrp/costPrice/
// wholesalePrice` (consumer-side `?? null`) and `attributes` (`.default({})`).
//
// These tests drive the REAL updateProduct against an in-memory store rather
// than asserting on payload shapes, because the bug lived in the seam between
// schema parsing and the Prisma write — shape assertions on either side alone
// would have passed while the seam leaked.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  ProductUpdateSchema,
  ProductVariationSchema,
} from "@/lib/validation/schemas";

interface VariationRow {
  id: string;
  productId: string;
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  label: string | null;
  color: string | null;
  size: string | null;
  dimensions: unknown;
  mrp: number | null;
  costPrice: number | null;
  wholesalePrice: number | null;
  active: boolean;
}

const store: {
  variations: VariationRow[];
  movements: { variationId: string }[];
  levels: { variationId: string; showroomKey: string; qty: number }[];
  seq: number;
} = { variations: [], movements: [], levels: [], seq: 0 };

function applyUpdate(row: VariationRow, data: Record<string, unknown>) {
  for (const [k, v] of Object.entries(data)) {
    // A Json column is cleared with Prisma.DbNull, not JS null; the real
    // database stores NULL either way, so normalise here rather than letting
    // the sentinel leak into assertions.
    (row as unknown as Record<string, unknown>)[k] =
      v === Prisma.DbNull ? null : v;
  }
}

const tx = {
  product: {
    update: vi.fn(async () => ({})),
    findUnique: vi.fn(async () => ({ id: "p1", variations: store.variations })),
  },
  productVariation: {
    findMany: vi.fn(async () =>
      store.variations.map((v) => ({ id: v.id, sku: v.sku })),
    ),
    update: vi.fn(
      async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = store.variations.find((v) => v.id === where.id);
        if (row) applyUpdate(row, data);
        return row;
      },
    ),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `v${++store.seq}`, ...(data as object) } as VariationRow;
      store.variations.push(row);
      return row;
    }),
    delete: vi.fn(async ({ where }: { where: { id: string } }) => {
      store.variations = store.variations.filter((v) => v.id !== where.id);
      return {};
    }),
  },
  stockMovement: {
    findFirst: vi.fn(async ({ where }: { where: { variationId: string } }) =>
      store.movements.find((m) => m.variationId === where.variationId) ?? null,
    ),
  },
  stockLevel: {
    create: vi.fn(async ({ data }: { data: { variationId: string; showroomKey: string; qty: number } }) => {
      store.levels.push(data);
      return data;
    }),
  },
  productImage: {
    deleteMany: vi.fn(async () => ({})),
    createMany: vi.fn(async () => ({})),
  },
};

vi.mock("@/lib/db", () => ({
  prisma: {
    product: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string; slug?: string } }) =>
        where.id ? { id: "p1" } : null,
      ),
    },
    $transaction: vi.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  },
}));

const { updateProduct } = await import("@/lib/cms/products");

function seedVariation(over: Partial<VariationRow> = {}): VariationRow {
  const row: VariationRow = {
    id: "v-existing",
    productId: "p1",
    sku: "BOWL-M",
    price: 4500,
    stock: 7,
    attributes: { finish: "antique brass" },
    label: "Medium",
    color: "brass",
    size: "M",
    dimensions: { diameter: 12, unit: "cm" },
    mrp: 5200,
    costPrice: 2100,
    wholesalePrice: 3300,
    active: true,
    ...over,
  };
  store.variations.push(row);
  return row;
}

/** A minimal valid product payload; `variations` is what each test varies. */
function payload(variations: unknown[]) {
  return ProductUpdateSchema.parse({
    slug: "singing-bowl",
    name: "Singing Bowl",
    description: "A bowl that sings.",
    price: 4500,
    variations,
  });
}

beforeEach(() => {
  store.variations = [];
  store.movements = [];
  store.levels = [];
  store.seq = 0;
});

describe("Zod is what preserves absence — pin the behaviour this rests on", () => {
  it("drops an absent optional key but keeps an explicit null", () => {
    const absent = ProductUpdateSchema.parse({
      slug: "s",
      name: "n",
      description: "d",
      price: 1,
      variations: [{ sku: "A", price: 1 }],
    }).variations[0];
    const nulled = ProductUpdateSchema.parse({
      slug: "s",
      name: "n",
      description: "d",
      price: 1,
      variations: [{ sku: "A", price: 1, label: null }],
    }).variations[0];

    expect("label" in absent).toBe(false);
    expect("label" in nulled).toBe(true);
    expect(nulled.label).toBeNull();
    // The two fields that used to manufacture a value must no longer do so.
    expect("active" in absent).toBe(false);
    expect("attributes" in absent).toBe(false);
  });

  it("the CREATE schema still defaults, because create has nothing to preserve", () => {
    const created = ProductVariationSchema.parse({ sku: "A", price: 1 });
    expect(created.active).toBe(true);
    expect(created.attributes).toEqual({});
  });
});

describe("THE ARMED SCENARIO: a retired variation must not be resurrected", () => {
  it("retires a dropped variation that has ledger history, then keeps it retired", async () => {
    const v = seedVariation();
    store.movements.push({ variationId: v.id });

    // 1. Drop it from the payload -> retired, not deleted (ledger survives).
    await updateProduct("p1", payload([]), "tester@example.com");
    expect(store.variations).toHaveLength(1);
    expect(store.variations[0].active).toBe(false);

    // 2. A later sloppy update sends the SKU back WITHOUT `active`.
    //    Pre-fix this re-activated it: sellable stock the owner thinks is gone.
    await updateProduct(
      "p1",
      payload([{ sku: "BOWL-M", price: 4500 }]),
      "tester@example.com",
    );
    expect(store.variations[0].active).toBe(false);
  });

  it("still re-activates on an EXPLICIT active: true — the door opens on purpose", async () => {
    const v = seedVariation({ active: false });
    store.movements.push({ variationId: v.id });

    await updateProduct(
      "p1",
      payload([{ sku: "BOWL-M", price: 4500, active: true }]),
      "tester@example.com",
    );
    expect(store.variations[0].active).toBe(true);
  });

  it("hard-deletes a dropped variation with no ledger history (unchanged)", async () => {
    seedVariation();
    await updateProduct("p1", payload([]), "tester@example.com");
    expect(store.variations).toHaveLength(0);
  });
});

describe("PRESERVATION: omitted fields keep their stored value", () => {
  it("preserves every reporting field when the payload omits them", async () => {
    seedVariation();
    await updateProduct(
      "p1",
      payload([{ sku: "BOWL-M", price: 4900 }]),
      "tester@example.com",
    );
    const row = store.variations[0];
    expect(row.price).toBe(4900); // price is required and does update
    expect(row.label).toBe("Medium");
    expect(row.color).toBe("brass");
    expect(row.size).toBe("M");
    expect(row.mrp).toBe(5200);
    expect(row.costPrice).toBe(2100);
    expect(row.wholesalePrice).toBe(3300);
    expect(row.dimensions).toEqual({ diameter: 12, unit: "cm" });
    expect(row.attributes).toEqual({ finish: "antique brass" });
    expect(row.active).toBe(true);
  });

  it("an explicit null clears — the control that the door still opens", async () => {
    seedVariation();
    await updateProduct(
      "p1",
      payload([
        {
          sku: "BOWL-M",
          price: 4500,
          label: null,
          color: null,
          size: null,
          dimensions: null,
          mrp: null,
          costPrice: null,
          wholesalePrice: null,
        },
      ]),
      "tester@example.com",
    );
    const row = store.variations[0];
    expect(row.label).toBeNull();
    expect(row.color).toBeNull();
    expect(row.size).toBeNull();
    expect(row.mrp).toBeNull();
    expect(row.costPrice).toBeNull();
    expect(row.wholesalePrice).toBeNull();
    expect(row.dimensions).toBeNull();
  });

  it("a value sets", async () => {
    seedVariation();
    await updateProduct(
      "p1",
      payload([
        { sku: "BOWL-M", price: 4500, label: "Large", mrp: 6000, active: false },
      ]),
      "tester@example.com",
    );
    const row = store.variations[0];
    expect(row.label).toBe("Large");
    expect(row.mrp).toBe(6000);
    expect(row.active).toBe(false);
  });
});

describe("REGRESSION: a compliant get-modify-send-full caller is unaffected", () => {
  it("writes exactly what a full payload says, as before the fix", async () => {
    seedVariation();
    await updateProduct(
      "p1",
      payload([
        {
          sku: "BOWL-M",
          price: 4500,
          stock: 7,
          attributes: { finish: "raw" },
          label: "Medium",
          color: "copper",
          size: "M",
          dimensions: { diameter: 14, unit: "cm" },
          mrp: 5200,
          costPrice: 2100,
          wholesalePrice: 3300,
          active: true,
        },
      ]),
      "tester@example.com",
    );
    const row = store.variations[0];
    expect(row.color).toBe("copper");
    expect(row.attributes).toEqual({ finish: "raw" });
    // DimensionsSchema fills its unit defaults on parse, so the stored blob is
    // the normalised one — asserted in full rather than partially.
    expect(row.dimensions).toEqual({
      diameter: 14,
      unit: "cm",
      weightUnit: "g",
    });
    expect(row.active).toBe(true);
    expect(row.label).toBe("Medium");
  });

  it("a NEW variation still gets create defaults, not preservation", async () => {
    await updateProduct(
      "p1",
      payload([{ sku: "BOWL-NEW", price: 1000 }]),
      "tester@example.com",
    );
    const row = store.variations[0];
    expect(row.sku).toBe("BOWL-NEW");
    expect(row.active).toBe(true);
    expect(row.attributes).toEqual({});
    expect(row.label).toBeNull();
  });
});
