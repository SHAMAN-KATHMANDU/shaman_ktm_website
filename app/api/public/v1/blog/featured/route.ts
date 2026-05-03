import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { blogPostSummaryFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const revalidate = 60;

export async function GET(req: Request) {
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
    { message: "ok", posts: rows.map(blogPostSummaryFromRow) },
    { headers: { "Cache-Tag": CACHE_TAGS.blog } },
  );
}
