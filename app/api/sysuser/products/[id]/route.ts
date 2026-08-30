export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { ProductUpdateSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { updateProduct } from "@/lib/cms/products";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";
import { ONLINE_STOCK_LEVEL_SELECT, onlineStockOf } from "@/lib/stock/constants";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("viewer");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const row = await prisma.product.findUnique({
    where: { id },
    include: {
      variations: { include: { stockLevels: ONLINE_STOCK_LEVEL_SELECT } },
      images: { orderBy: { position: "asc" } },
      category: true,
    },
  });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({
    message: "ok",
    product: {
      ...row,
      variations: row.variations.map(({ stockLevels, ...variation }) => ({
        ...variation,
        aggregateStock: variation.stock,
        onlineStock: onlineStockOf({ stockLevels }),
      })),
    },
  });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, ProductUpdateSchema);
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
  const g = await requireRole("editor");
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { name: true },
  });
  try {
    await prisma.product.delete({ where: { id } });
  } catch (err) {
    // A product that has been sold or ordered is referenced by SaleLine and
    // OrderItem with onDelete: Restrict, because deleting it would leave holes
    // in the sales history. Say that plainly and name the way out, instead of
    // letting a foreign-key violation surface as a 500.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2003" || err.code === "P2014")
    ) {
      await prisma.product.update({ where: { id }, data: { status: "archived" } });
      logAction({ actor: g.session.email, action: "update", entity: "Product", entityId: id, summary: `${existing?.name ?? id} archived; referenced history preserved` });
      bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage, CACHE_TAGS.collections, CACHE_TAGS.bundles);
      return NextResponse.json({ message: "archived", archived: true });
    }
    throw err;
  }
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
