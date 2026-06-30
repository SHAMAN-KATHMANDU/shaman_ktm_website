export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  blogPostDetailFromRow,
  blogPostSummaryFromRow,
} from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { localeFromRequest } from "@/lib/i18n/locale";

export const revalidate = 60;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const locale = localeFromRequest(req);
  const { slug } = await ctx.params;
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!post || post.status !== "published") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  const related = await prisma.blogPost.findMany({
    where: {
      slug: { not: slug },
      status: "published",
      categorySlug: post.categorySlug,
    },
    orderBy: { publishedAt: "desc" },
    take: 4,
    include: { category: true },
  });

  return NextResponse.json(
    {
      message: "ok",
      post: blogPostDetailFromRow(post, locale),
      related: related.map((r) => blogPostSummaryFromRow(r, locale)),
    },
    { headers: { "Cache-Tag": CACHE_TAGS.blog } },
  );
}
