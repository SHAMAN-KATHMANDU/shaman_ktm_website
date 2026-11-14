export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { blogPostSummaryFromRow } from "@/lib/api/server/dto";
import { localeFromRequest } from "@/lib/i18n/locale";

export async function GET(req: Request) {
  const locale = localeFromRequest(req);
  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    20,
    Math.max(1, parseInt(searchParams.get("limit") ?? "4", 10) || 4),
  );

  const rows = await prisma.blogPost.findMany({
    where: { status: "published", isFeatured: true },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: { category: true },
  });

  return NextResponse.json(
    { message: "ok", posts: rows.map((r) => blogPostSummaryFromRow(r, locale)) },
  );
}
