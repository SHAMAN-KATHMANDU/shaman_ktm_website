export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { ProductSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";

export async function GET(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { searchParams } = new URL(req.url);
  const light = searchParams.get("light");
  const search = searchParams.get("q") || undefined;

  if (light === "1") {
    const rows = await prisma.product.findMany({
      orderBy: { name: "asc" },
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      select: {
        id: true,
        slug: true,
        name: true,
        thumbnailUrl: true,
        price: true,
        isFeatured: true,
        isNewRelease: true,
        elementSlugs: true,
        tags: true,
        status: true,
      },
    });
    return NextResponse.json({ message: "ok", products: rows });
  }

  const rows = await prisma.product.findMany({
    orderBy: { updatedAt: "desc" },
    where: search
      ? { name: { contains: search, mode: "insensitive" } }
      : undefined,
    include: { variations: true, images: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json({ message: "ok", products: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, ProductSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  const slugClash = await prisma.product.findUnique({
    where: { slug: d.slug },
    select: { id: true },
  });
  if (slugClash) {
    return NextResponse.json(
      { message: `A product with slug "${d.slug}" already exists.` },
      { status: 409 },
    );
  }

  const created = await prisma.product.create({
    data: {
      slug: d.slug,
      name: d.name,
      description: d.description,
      price: d.price,
      compareAtPrice: d.compareAtPrice ?? null,
      currency: d.currency,
      thumbnailUrl: d.thumbnailUrl ?? null,
      vendorId: d.vendorId ?? null,
      elementSlugs: d.elementSlugs ?? [],
      categoryId: d.categoryId ?? null,
      isFeatured: d.isFeatured,
      isNewRelease: d.isNewRelease,
      priceOnEnquiry: d.priceOnEnquiry,
      position: d.position,
      status: d.status,
      publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
      tags: d.tags,
      lastEditedBy: g.session.email,
      images: {
        create: (d.images ?? []).map((img) => ({
          url: img.url,
          alt: img.alt ?? null,
          position: img.position,
        })),
      },
      variations: {
        create: (d.variations ?? []).map((v) => ({
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          attributes: v.attributes,
        })),
      },
    },
    include: { images: true, variations: true },
  });
  logAction({
    actor: g.session.email,
    action: "create",
    entity: "Product",
    entityId: created.id,
    summary: created.name,
  });
  bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage);
  return NextResponse.json({ message: "ok", product: created });
}
