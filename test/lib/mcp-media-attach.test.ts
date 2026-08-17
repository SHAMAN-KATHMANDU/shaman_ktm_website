// lib/cms/media-attach: keeps ENTITY_IMAGE_FIELDS in lockstep with
// prisma/schema.prisma, and exercises the product-gallery mutations against
// an in-memory fake of the Prisma calls they make.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { CmsError } from "@/lib/cms/errors";
import { ENTITY_IMAGE_TARGETS } from "@/lib/validation/schemas";

// ─── In-memory product/image store ───────────────────────────────────────────

type Img = {
  id: string;
  productId: string;
  url: string;
  alt: string | null;
  altNe: string | null;
  position: number;
};
const state: {
  product: { id: string; thumbnailUrl: string | null } | null;
  images: Img[];
  seq: number;
} = { product: null, images: [], seq: 0 };

function productWithImages() {
  if (!state.product) return null;
  return {
    ...state.product,
    images: [...state.images].sort((a, b) => a.position - b.position),
    variations: [],
  };
}

const productModel = {
  findUnique: async ({ where }: { where: { id?: string; slug?: string } }) =>
    where.id && state.product?.id === where.id ? productWithImages() : null,
  update: async ({
    data,
  }: {
    where: { id: string };
    data: { thumbnailUrl?: string | null };
  }) => {
    if (state.product && "thumbnailUrl" in data) {
      state.product.thumbnailUrl = data.thumbnailUrl ?? null;
    }
    return productWithImages();
  },
};
const productImageModel = {
  createMany: async ({ data }: { data: Omit<Img, "id">[] }) => {
    for (const d of data) state.images.push({ id: `img${++state.seq}`, ...d });
    return { count: data.length };
  },
  delete: async ({ where }: { where: { id: string } }) => {
    state.images = state.images.filter((i) => i.id !== where.id);
    return {};
  },
  update: async ({
    where,
    data,
  }: {
    where: { id: string };
    data: { position: number };
  }) => {
    const img = state.images.find((i) => i.id === where.id);
    if (img) img.position = data.position;
    return img;
  },
};

vi.mock("@/lib/db", () => {
  const tx = { product: productModel, productImage: productImageModel };
  return {
    prisma: {
      ...tx,
      $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
      // Generic stubs for the set_entity_image registry (lookup returns null).
      category: { findUnique: async () => null, update: async () => null },
      bundle: { findUnique: async () => null, update: async () => null },
      collection: { findUnique: async () => null, update: async () => null },
      blogPost: { findUnique: async () => null, update: async () => null },
      page: { findUnique: async () => null, update: async () => null },
      service: { findUnique: async () => null, update: async () => null },
    },
  };
});

const attach = await import("@/lib/cms/media-attach");

beforeEach(() => {
  state.product = { id: "p1", thumbnailUrl: null };
  state.images = [];
  state.seq = 0;
});

// ─── Registry ⇄ schema ───────────────────────────────────────────────────────

function schemaFields(): Map<string, Set<string>> {
  const schema = readFileSync(
    path.resolve(__dirname, "../../prisma/schema.prisma"),
    "utf8",
  );
  const models = new Map<string, Set<string>>();
  for (const m of schema.matchAll(/model\s+(\w+)\s+\{([^}]*)\}/g)) {
    const fields = new Set<string>();
    for (const line of m[2].split("\n")) {
      const f = line.match(/^\s*(\w+)\s+\S+/);
      if (f && !line.trim().startsWith("//")) fields.add(f[1]);
    }
    models.set(m[1], fields);
  }
  return models;
}

describe("ENTITY_IMAGE_FIELDS registry", () => {
  const models = schemaFields();
  it("covers every target in ENTITY_IMAGE_TARGETS and no more", () => {
    expect(Object.keys(attach.ENTITY_IMAGE_FIELDS).sort()).toEqual(
      [...ENTITY_IMAGE_TARGETS].sort(),
    );
  });
  it("only names String fields that exist on the prisma model", () => {
    for (const [target, def] of Object.entries(attach.ENTITY_IMAGE_FIELDS)) {
      const [modelKey, field] = target.split(".");
      expect(def.model.charAt(0).toLowerCase() + def.model.slice(1)).toBe(
        modelKey,
      );
      expect(def.field).toBe(field);
      const fields = models.get(def.model);
      expect(fields, `model ${def.model}`).toBeDefined();
      expect(fields, `${def.model}.${field}`).toContain(field);
      expect(def.tags.length).toBeGreaterThan(0);
    }
  });
  it("setEntityImage 404s with the model name when nothing matches", async () => {
    await expect(
      attach.setEntityImage("collection.heroImageUrl", "nope", "/x.jpg"),
    ).rejects.toMatchObject({ statusCode: 404, message: /Collection/ });
  });
});

// ─── Product gallery ops ─────────────────────────────────────────────────────

describe("addProductImages", () => {
  it("appends after the last position and auto-sets a missing thumbnail", async () => {
    state.images.push({
      id: "img0",
      productId: "p1",
      url: "/a.jpg",
      alt: null,
      altNe: null,
      position: 4,
    });
    const p = await attach.addProductImages("p1", [
      { url: "/b.jpg", alt: "B" },
      { url: "/c.jpg" },
    ]);
    expect(p?.images.map((i) => [i.url, i.position])).toEqual([
      ["/a.jpg", 4],
      ["/b.jpg", 5],
      ["/c.jpg", 6],
    ]);
    expect(p?.thumbnailUrl).toBe("/b.jpg"); // product had none → first new
  });
  it("keeps an existing thumbnail unless setThumbnail", async () => {
    state.product!.thumbnailUrl = "/keep.jpg";
    let p = await attach.addProductImages("p1", [{ url: "/n.jpg" }]);
    expect(p?.thumbnailUrl).toBe("/keep.jpg");
    p = await attach.addProductImages("p1", [{ url: "/new.jpg" }], {
      setThumbnail: true,
    });
    expect(p?.thumbnailUrl).toBe("/new.jpg");
  });
  it("404s for an unknown product", async () => {
    await expect(
      attach.addProductImages("missing", [{ url: "/x.jpg" }]),
    ).rejects.toBeInstanceOf(CmsError);
  });
});

describe("removeProductImage", () => {
  beforeEach(() => {
    state.images = ["/a.jpg", "/b.jpg", "/c.jpg"].map((url, i) => ({
      id: `i${i}`,
      productId: "p1",
      url,
      alt: null,
      altNe: null,
      position: i,
    }));
    state.product!.thumbnailUrl = "/a.jpg";
  });
  it("removes by url, renumbers, and moves the thumbnail to the next image", async () => {
    const p = await attach.removeProductImage("p1", { url: "/a.jpg" });
    expect(p?.images.map((i) => [i.id, i.position])).toEqual([
      ["i1", 0],
      ["i2", 1],
    ]);
    expect(p?.thumbnailUrl).toBe("/b.jpg");
  });
  it("removes by id and leaves an unrelated thumbnail alone", async () => {
    const p = await attach.removeProductImage("p1", { imageId: "i2" });
    expect(p?.images.map((i) => i.id)).toEqual(["i0", "i1"]);
    expect(p?.thumbnailUrl).toBe("/a.jpg");
  });
  it("lists availableOptions when the reference is unknown", async () => {
    await expect(
      attach.removeProductImage("p1", { imageId: "zzz" }),
    ).rejects.toMatchObject({
      statusCode: 404,
      availableOptions: ["i0 /a.jpg", "i1 /b.jpg", "i2 /c.jpg"],
    });
    await expect(attach.removeProductImage("p1", {})).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe("reorderProductImages / resolveImageOrder", () => {
  const existing = [
    { id: "i0", url: "/a.jpg" },
    { id: "i1", url: "/b.jpg" },
    { id: "i2", url: "/c.jpg" },
  ];
  it("accepts a permutation mixing ids and urls", () => {
    expect(attach.resolveImageOrder(existing, ["/c.jpg", "i0", "i1"])).toEqual([
      "i2",
      "i0",
      "i1",
    ]);
  });
  it("rejects unknown, duplicate, and incomplete orders", () => {
    expect(() => attach.resolveImageOrder(existing, ["i0", "i1", "nope"])).toThrow(
      /Unknown image/,
    );
    expect(() => attach.resolveImageOrder(existing, ["i0", "/a.jpg", "i1"])).toThrow(
      /Duplicate/,
    );
    expect(() => attach.resolveImageOrder(existing, ["i0", "i1"])).toThrow(
      /every image exactly once/,
    );
  });
  it("persists the new positions", async () => {
    state.images = existing.map((e, i) => ({
      ...e,
      productId: "p1",
      alt: null,
      altNe: null,
      position: i,
    }));
    const p = await attach.reorderProductImages("p1", ["i2", "i0", "i1"]);
    expect(p?.images.map((i) => [i.id, i.position])).toEqual([
      ["i2", 0],
      ["i0", 1],
      ["i1", 2],
    ]);
  });
});
