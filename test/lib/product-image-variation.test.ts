// Per-variation product images (ProductImage.variationId).
//
// The load-bearing claim under test is an ORDERING one: updateProduct must
// write variations BEFORE images, because an image names its variation by SKU
// and that SKU may belong to a variation the same payload is creating. If the
// images were written first — as they were before this change — such an image
// could never be assigned, and the feature would silently half-work: correct
// for variations that already existed, null for the ones you just added.
//
// Prisma is faked in memory, in the style of mcp-media-attach.test.ts, so the
// ordering is observed through the writes the code actually performs.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CmsError } from "@/lib/cms/errors";

type Variation = { id: string; productId: string; sku: string; stock: number; active: boolean };
type Image = {
  productId: string;
  url: string;
  alt: string | null;
  altNe: string | null;
  position: number;
  variationId: string | null;
};

const state: {
  variations: Variation[];
  images: Image[];
  movements: Array<{ variationId: string }>;
  seq: number;
  writes: string[];
} = { variations: [], images: [], movements: [], seq: 0, writes: [] };

const prismaFake = {
  $transaction: async (fn: (tx: unknown) => unknown) => fn(prismaFake),
  category: { findUnique: async () => ({ id: "cat_1" }) },
  product: {
    // Two different callers: the existence check looks up by id, the
    // slug-uniqueness check looks up by slug and must find nothing.
    findUnique: async ({ where }: { where: { id?: string; slug?: string } }) =>
      where.slug ? null : { id: "prod_1" },
    findUniqueOrThrow: async () => ({ id: "prod_1" }),
    update: async () => ({ id: "prod_1" }),
    create: async ({ data }: { data: { variations?: { create: Array<{ sku: string; stock: number; active: boolean }> } } }) => {
      state.writes.push("product.create");
      for (const v of data.variations?.create ?? []) {
        state.variations.push({
          id: `var_${++state.seq}`,
          productId: "prod_1",
          sku: v.sku,
          stock: v.stock,
          active: v.active,
        });
      }
      return { id: "prod_1", variations: [...state.variations] };
    },
  },
  productImage: {
    deleteMany: async () => {
      state.writes.push("image.deleteMany");
      state.images = [];
      return { count: 0 };
    },
    createMany: async ({ data }: { data: Image[] }) => {
      state.writes.push("image.createMany");
      state.images.push(...data);
      return { count: data.length };
    },
  },
  productVariation: {
    findMany: async () => state.variations.map((v) => ({ id: v.id, sku: v.sku })),
    update: async ({ where, data }: { where: { id: string }; data: { active?: boolean; stock?: number } }) => {
      state.writes.push("variation.update");
      const v = state.variations.find((x) => x.id === where.id)!;
      if (data.active !== undefined) v.active = data.active;
      // `stock` must never be written by the product update path.
      if (data.stock !== undefined) v.stock = data.stock;
      return v;
    },
    create: async ({ data }: { data: { sku: string; stock: number; active: boolean } }) => {
      state.writes.push("variation.create");
      const v: Variation = {
        id: `var_${++state.seq}`,
        productId: "prod_1",
        sku: data.sku,
        stock: data.stock,
        active: data.active,
      };
      state.variations.push(v);
      return v;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      state.writes.push("variation.delete");
      state.variations = state.variations.filter((v) => v.id !== where.id);
      return { id: where.id };
    },
  },
  stockMovement: {
    findFirst: async ({ where }: { where: { variationId: string } }) =>
      state.movements.find((m) => m.variationId === where.variationId) ?? null,
  },
};

vi.mock("@/lib/db", () => ({ prisma: prismaFake }));

const { createProduct, updateProduct } = await import("@/lib/cms/products");

/** A ProductInput with only the fields these tests exercise. */
function payload(over: Record<string, unknown>) {
  return {
    slug: "s",
    name: "n",
    description: "d",
    price: 100,
    currency: "NPR",
    elementSlugs: [],
    isFeatured: false,
    isNewRelease: false,
    priceOnEnquiry: false,
    position: 0,
    status: "published",
    tags: [],
    images: [],
    variations: [],
    wholesaleEnabled: false,
    ...over,
  } as unknown as Parameters<typeof updateProduct>[1];
}

const variation = (sku: string, over: Record<string, unknown> = {}) => ({
  sku,
  price: 100,
  stock: 0,
  attributes: {},
  active: true,
  ...over,
});
const image = (url: string, variationSku?: string | null) => ({
  url,
  position: 0,
  ...(variationSku === undefined ? {} : { variationSku }),
});

beforeEach(() => {
  state.variations = [];
  state.images = [];
  state.movements = [];
  state.seq = 0;
  state.writes = [];
});

describe("updateProduct resolves image -> variation by SKU", () => {
  it("rejects an image naming a SKU that is not in the payload", async () => {
    state.variations.push({ id: "var_9", productId: "prod_1", sku: "RED", stock: 0, active: true });
    await expect(
      updateProduct("prod_1", payload({ variations: [variation("RED")], images: [image("/a.jpg", "BLUE")] }), "e@x"),
    ).rejects.toThrow(CmsError);
  });

  it("names the valid SKUs in availableOptions", async () => {
    state.variations.push({ id: "var_9", productId: "prod_1", sku: "RED", stock: 0, active: true });
    let err: unknown;
    try {
      await updateProduct(
        "prod_1",
        payload({ variations: [variation("RED")], images: [image("/a.jpg", "BLUE")] }),
        "e@x",
      );
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(CmsError);
    const cms = err as CmsError;
    expect(cms.statusCode).toBe(400);
    expect(cms.referenceKind).toBe("productVariation");
    expect(cms.availableOptions).toEqual(["RED"]);
  });

  // ── THE TEST THAT CANNOT PASS WITHOUT THE REORDER ──────────────────────────
  it("assigns an image to a variation CREATED IN THE SAME SAVE", async () => {
    // No variations exist yet: BLUE is born in this very payload.
    await updateProduct(
      "prod_1",
      payload({ variations: [variation("BLUE")], images: [image("/blue.jpg", "BLUE")] }),
      "e@x",
    );
    const blue = state.variations.find((v) => v.sku === "BLUE")!;
    expect(blue).toBeDefined();
    expect(state.images).toHaveLength(1);
    expect(state.images[0].variationId).toBe(blue.id);
  });

  it("writes variations before images — the ordering the feature rests on", async () => {
    await updateProduct(
      "prod_1",
      payload({ variations: [variation("BLUE")], images: [image("/blue.jpg", "BLUE")] }),
      "e@x",
    );
    expect(state.writes.indexOf("variation.create")).toBeLessThan(
      state.writes.indexOf("image.createMany"),
    );
  });
});

describe("gallery images are untouched by the change", () => {
  it("leaves variationId null when no variationSku is given", async () => {
    await updateProduct("prod_1", payload({ images: [image("/plain.jpg")] }), "e@x");
    expect(state.images[0].variationId).toBeNull();
  });

  it("accepts an explicit null the same way", async () => {
    await updateProduct("prod_1", payload({ images: [image("/plain.jpg", null)] }), "e@x");
    expect(state.images[0].variationId).toBeNull();
  });

  it("createProduct assigns images to variations born in the same call", async () => {
    await createProduct(
      payload({ variations: [variation("GREEN")], images: [image("/g.jpg", "GREEN")] }) as never,
      "e@x",
    );
    const green = state.variations.find((v) => v.sku === "GREEN")!;
    expect(state.images[0].variationId).toBe(green.id);
  });
});

describe("the SKU-upsert behaviour this reorder moved is unchanged", () => {
  it("retires a dropped variation that has stock history instead of deleting it", async () => {
    state.variations.push({ id: "var_h", productId: "prod_1", sku: "OLD", stock: 5, active: true });
    state.movements.push({ variationId: "var_h" });
    await updateProduct("prod_1", payload({ variations: [] }), "e@x");
    expect(state.variations.find((v) => v.id === "var_h")?.active).toBe(false);
    expect(state.writes).not.toContain("variation.delete");
  });

  it("hard-deletes a dropped variation with no history", async () => {
    state.variations.push({ id: "var_n", productId: "prod_1", sku: "NEW", stock: 0, active: true });
    await updateProduct("prod_1", payload({ variations: [] }), "e@x");
    expect(state.variations.find((v) => v.id === "var_n")).toBeUndefined();
  });

  it("never overwrites a matched variation's materialized stock", async () => {
    state.variations.push({ id: "var_s", productId: "prod_1", sku: "KEEP", stock: 42, active: true });
    await updateProduct("prod_1", payload({ variations: [variation("KEEP", { stock: 0 })] }), "e@x");
    expect(state.variations.find((v) => v.id === "var_s")?.stock).toBe(42);
  });
});
