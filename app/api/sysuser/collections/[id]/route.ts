import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { CollectionSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const row = await prisma.collection.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { position: "asc" },
        include: {
          product: { select: { id: true, name: true, thumbnailUrl: true } },
        },
      },
    },
  });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", collection: row });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, CollectionSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.collection.update({
      where: { id },
      data: {
        slug: d.slug,
        title: d.title,
        subtitle: d.subtitle ?? null,
        heroImageUrl: d.heroImageUrl ?? null,
        position: d.position,
      },
    });
    await tx.collectionProduct.deleteMany({ where: { collectionId: id } });
    if ((d.productIds?.length ?? 0)) {
      await tx.collectionProduct.createMany({
        data: (d.productIds ?? []).map((productId, idx) => ({
          collectionId: id,
          productId,
          position: idx,
        })),
        skipDuplicates: true,
      });
    }
    return tx.collection.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: {
            product: { select: { id: true, name: true, thumbnailUrl: true } },
          },
        },
      },
    });
  });
  bumpTags(CACHE_TAGS.collections);
  return NextResponse.json({ message: "ok", collection: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  await prisma.collection.delete({ where: { id } });
  bumpTags(CACHE_TAGS.collections);
  return NextResponse.json({ message: "ok" });
}
