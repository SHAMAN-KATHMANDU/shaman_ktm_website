export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { ProductSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const row = await prisma.product.findUnique({
    where: { id },
    include: {
      variations: true,
      images: { orderBy: { position: "asc" } },
      category: true,
    },
  });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", product: row });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, ProductSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  // Replace images and variations atomically.
  const updated = await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        slug: d.slug,
        name: d.name,
        description: d.description,
        price: d.price,
        compareAtPrice: d.compareAtPrice ?? null,
        currency: d.currency,
        thumbnailUrl: d.thumbnailUrl ?? null,
        vendorId: d.vendorId ?? null,
        elementSlug: d.elementSlug ?? null,
        categoryId: d.categoryId ?? null,
        isFeatured: d.isFeatured,
        isNewRelease: d.isNewRelease,
        priceOnEnquiry: d.priceOnEnquiry,
        position: d.position,
        status: d.status,
        publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
        tags: d.tags,
      },
    });

    await tx.productImage.deleteMany({ where: { productId: id } });
    if ((d.images?.length ?? 0)) {
      await tx.productImage.createMany({
        data: (d.images ?? []).map((img) => ({
          productId: id,
          url: img.url,
          alt: img.alt ?? null,
          position: img.position,
        })),
      });
    }

    await tx.productVariation.deleteMany({ where: { productId: id } });
    if ((d.variations?.length ?? 0)) {
      await tx.productVariation.createMany({
        data: (d.variations ?? []).map((v) => ({
          productId: id,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          attributes: v.attributes,
        })),
      });
    }

    return tx.product.findUnique({
      where: { id },
      include: {
        variations: true,
        images: { orderBy: { position: "asc" } },
      },
    });
  });

  bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage, CACHE_TAGS.collections, CACHE_TAGS.bundles);
  return NextResponse.json({ message: "ok", product: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  await prisma.product.delete({ where: { id } });
  bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage, CACHE_TAGS.collections, CACHE_TAGS.bundles);
  return NextResponse.json({ message: "ok" });
}
