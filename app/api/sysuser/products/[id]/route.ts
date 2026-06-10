export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { ProductSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { updateProduct } from "@/lib/cms/products";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

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

  let updated;
  try {
    updated = await updateProduct(id, parsed.data, g.session.email);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }

  logAction({
    actor: g.session.email,
    action: "update",
    entity: "Product",
    entityId: id,
    summary: updated?.name ?? null,
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
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { name: true },
  });
  await prisma.product.delete({ where: { id } });
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "Product",
    entityId: id,
    summary: existing?.name ?? null,
  });
  bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage, CACHE_TAGS.collections, CACHE_TAGS.bundles);
  return NextResponse.json({ message: "ok" });
}
