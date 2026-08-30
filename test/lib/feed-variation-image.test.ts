import { beforeEach, describe, expect, it, vi } from "vitest";

const findMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: { product: { findMany } } }));
vi.mock("@/lib/seo", () => ({ siteUrl: "https://shop.test" }));

const { GET } = await import("@/app/feeds/products/route");

function product(images: Array<{ url: string; variationId: string | null }>) {
  return {
    slug: "bracelet",
    name: "Bracelet",
    description: "Stone bracelet",
    price: 1000,
    compareAtPrice: null,
    currency: "NPR",
    stockQuantity: null,
    dimensions: null,
    thumbnailUrl: "/thumbnail.jpg",
    images,
    variations: [
      { id: "turquoise", price: 1000, stock: 2, attributes: { color: "Turquoise" } },
      { id: "lavender", price: 1000, stock: 2, attributes: { color: "Lavender" } },
    ],
  };
}

beforeEach(() => findMany.mockReset());

describe("product feed variation images", () => {
  it("uses the image linked by variationId instead of a legacy attribute guess", async () => {
    findMany.mockResolvedValue([
      product([
        { url: "/turquoise.jpg", variationId: "turquoise" },
        { url: "/lavender.jpg", variationId: "lavender" },
      ]),
    ]);

    const xml = await (await GET()).text();
    expect(xml).toContain("<g:id>turquoise</g:id>");
    expect(xml).toContain("<g:image_link>https://shamankathmandu.com/turquoise.jpg</g:image_link>");
    expect(xml).toContain("<g:image_link>https://shamankathmandu.com/lavender.jpg</g:image_link>");
  });

  it("falls back only to the product thumbnail when no linked image exists", async () => {
    findMany.mockResolvedValue([
      product([
        { url: "/turquoise.jpg", variationId: "turquoise" },
      ]),
    ]);

    const xml = await (await GET()).text();
    expect(xml).toContain("<g:image_link>https://shamankathmandu.com/thumbnail.jpg</g:image_link>");
  });
});
