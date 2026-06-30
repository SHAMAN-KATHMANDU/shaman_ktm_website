export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pageDetailFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { localeFromRequest } from "@/lib/i18n/locale";

export const revalidate = 60;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const locale = localeFromRequest(req);
  const { slug } = await ctx.params;
  const row = await prisma.page.findUnique({ where: { slug } });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json(
    { message: "ok", page: pageDetailFromRow(row, locale) },
    { headers: { "Cache-Tag": CACHE_TAGS.pages } },
  );
}
