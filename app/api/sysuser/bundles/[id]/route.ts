import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { BundleSchema } from "@/lib/validation/schemas";
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
  const row = await prisma.bundle.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          product: { select: { id: true, name: true, thumbnailUrl: true } },
        },
      },
    },
  });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", bundle: row });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, BundleSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const updated = await prisma.$transaction(async (tx) => {
    await tx.bundle.update({
      where: { id },
      data: {
        slug: d.slug,
        title: d.title,
        description: d.description ?? null,
        price: d.price,
        compareAtPrice: d.compareAtPrice ?? null,
        thumbnailUrl: d.thumbnailUrl ?? null,
        position: d.position,
      },
    });
    await tx.bundleItem.deleteMany({ where: { bundleId: id } });
    if (d.items.length) {
      await tx.bundleItem.createMany({
        data: d.items.map((it) => ({
          bundleId: id,
          productId: it.productId,
          quantity: it.quantity,
          position: it.position,
        })),
      });
    }
    return tx.bundle.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            product: { select: { id: true, name: true, thumbnailUrl: true } },
          },
        },
      },
    });
  });
  bumpTags(CACHE_TAGS.bundles);
  return NextResponse.json({ message: "ok", bundle: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  await prisma.bundle.delete({ where: { id } });
  bumpTags(CACHE_TAGS.bundles);
  return NextResponse.json({ message: "ok" });
}
