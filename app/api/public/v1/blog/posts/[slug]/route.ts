import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  blogPostDetailFromRow,
  blogPostSummaryFromRow,
} from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const revalidate = 60;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
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
      post: blogPostDetailFromRow(post),
      related: related.map(blogPostSummaryFromRow),
    },
    { headers: { "Cache-Tag": CACHE_TAGS.blog } },
  );
}
