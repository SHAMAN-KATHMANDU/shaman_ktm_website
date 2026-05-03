export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { BlogPostSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const rows = await prisma.blogPost.findMany({
    orderBy: { updatedAt: "desc" },
    include: { category: true },
  });
  return NextResponse.json({ message: "ok", posts: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, BlogPostSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  const row = await prisma.blogPost.create({
    data: {
      slug: d.slug,
      title: d.title,
      excerpt: d.excerpt,
      bodyMarkdown: d.bodyMarkdown,
      heroImageUrl: d.heroImageUrl ?? null,
      heroVideoEmbedUrl: d.heroVideoEmbedUrl,
      authorName: d.authorName,
      categorySlug: d.categorySlug ?? null,
      tags: d.tags,
      isFeatured: d.isFeatured,
      status: d.status,
      publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
      readingMinutes: d.readingMinutes,
      seoTitle: d.seoTitle ?? null,
      seoDescription: d.seoDescription ?? null,
    },
  });
  bumpTags(CACHE_TAGS.blog, CACHE_TAGS.homepage);
  return NextResponse.json({ message: "ok", post: row });
}
