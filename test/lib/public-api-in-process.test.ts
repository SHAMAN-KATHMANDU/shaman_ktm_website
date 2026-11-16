// Storefront pages read the catalog in-process (lib/api/live → lib/api/server)
// instead of fetching their own /api/public/v1 routes over loopback. The two
// paths must hand out the same DTO, and a missing product must still throw so
// pages keep rendering notFound(). Prisma is faked in memory.

import { describe, expect, it, vi } from "vitest";

const row = {
  id: "p1",
  name: "Singing Bowl",
  nameNe: "गाउने कचौरा",
  slug: "singing-bowl",
  sku: "SB-1",
  price: 4500,
  compareAtPrice: null,
  currency: "NPR",
  stockQuantity: null,
  dimensions: null,
  thumbnailUrl: "https://example.test/sb.jpg",
  categoryId: "c1",
  vendorId: null,
  description: "Hand-hammered.",
  tags: ["bowl"],
  createdAt: new Date("2026-01-01T00:00:00Z"),
  priceOnEnquiry: false,
  elementSlugs: ["earth"],
  status: "published",
  variations: [
    {
      id: "v1",
      sku: "SB-1-S",
      price: 4500,
      stock: 9,
      stockLevels: [{ qty: 3 }],
      attributes: { size: "S" },
      images: [{ url: "https://example.test/v1.jpg", alt: "Small", altNe: null }],
    },
  ],
  images: [{ url: "https://example.test/sb.jpg" }],
  category: { id: "c1", name: "Bowls", slug: "bowls" },
};

const findFirst = vi.fn(async (args: { where: { OR: { id?: string; slug?: string }[] } }) =>
  args.where.OR.some((c) => c.id === row.id || c.slug === row.slug) ? row : null,
);
const findMany = vi.fn(async (_args: { take: number }) => [row, row, row, row]);

vi.mock("@/lib/db", () => ({ prisma: { product: { findFirst, findMany } } }));

const { GET } = await import("@/app/api/public/v1/products/[idOrSlug]/route");
const server = await import("@/lib/api/server/products");
const live = await import("@/lib/api/live/products");

const call = (idOrSlug: string, query = "") =>
  GET(new Request(`http://x/api/public/v1/products/${idOrSlug}${query}`), {
    params: Promise.resolve({ idOrSlug }),
  });

describe("public product API, route vs in-process", () => {
  it("returns the same product DTO from the route and the in-process function", async () => {
    for (const locale of ["en", "ne"] as const) {
      const res = await call("singing-bowl", locale === "ne" ? "?locale=ne" : "");
      expect(res.status).toBe(200);
      const body = (await res.json()) as { product: unknown };
      const direct = await live.getProduct("singing-bowl", locale);
      expect(body.product).toEqual(JSON.parse(JSON.stringify(direct)));
    }
    expect((await live.getProduct("p1", "ne")).name).toBe("गाउने कचौरा");
  });

  it("404s over HTTP and throws in-process for a missing product", async () => {
    expect((await call("nope")).status).toBe(404);
    await expect(live.getProduct("nope")).rejects.toMatchObject({ status: 404 });
  });

  it("related products asks the DB for 4 summaries only", async () => {
    findMany.mockClear();
    const related = await server.getRelatedProducts("singing-bowl", "en");
    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany.mock.calls[0][0].take).toBe(4);
    expect(related).toHaveLength(4);
    expect(related![0]).not.toHaveProperty("coPurchaseCount");
    expect(await server.getRelatedProducts("nope")).toBeNull();
  });
});
