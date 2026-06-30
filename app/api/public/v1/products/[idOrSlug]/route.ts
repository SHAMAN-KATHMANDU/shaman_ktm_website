export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { productDetailFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { localeFromRequest } from "@/lib/i18n/locale";

export const revalidate = 60;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ idOrSlug: string }> },
) {
  const locale = localeFromRequest(req);
  const { idOrSlug } = await ctx.params;
  const row = await prisma.product.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      variations: true,
      images: { orderBy: { position: "asc" } },
      category: true,
    },
  });
  if (!row) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { message: "ok", product: productDetailFromRow(row, locale) },
    { headers: { "Cache-Tag": CACHE_TAGS.products } },
  );
}
