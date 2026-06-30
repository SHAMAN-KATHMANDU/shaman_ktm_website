export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { collectionFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { localeFromRequest } from "@/lib/i18n/locale";

export const revalidate = 60;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const locale = localeFromRequest(req);
  const { slug } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10) || 24),
  );

  const row = await prisma.collection.findUnique({
    where: { slug },
    include: {
      products: {
        orderBy: { position: "asc" },
        take: limit,
        include: {
          product: { include: { variations: true } },
        },
      },
    },
  });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });

  return NextResponse.json(
    { message: "ok", collection: collectionFromRow(row, locale) },
    { headers: { "Cache-Tag": CACHE_TAGS.collections } },
  );
}
