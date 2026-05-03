import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { blogPostSummaryFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const revalidate = 60;

function intParam(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, intParam(searchParams.get("page"), 1));
  const limit = Math.min(50, Math.max(1, intParam(searchParams.get("limit"), 10)));
  const categorySlug = searchParams.get("categorySlug") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const q = searchParams.get("q") || undefined;

  const where: Prisma.BlogPostWhereInput = { status: "published" };
  if (categorySlug) where.categorySlug = categorySlug;
  if (tag) where.tags = { has: tag };
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { excerpt: { contains: q, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { category: true },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return NextResponse.json(
    {
      message: "ok",
      posts: rows.map(blogPostSummaryFromRow),
      total,
      page,
      limit,
    },
    { headers: { "Cache-Tag": CACHE_TAGS.blog } },
  );
}
