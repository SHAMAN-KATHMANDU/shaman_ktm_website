export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { BlogPostSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const row = await prisma.blogPost.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", post: row });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, BlogPostSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const row = await prisma.blogPost.update({
    where: { id },
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
      publishedAt: d.publishedAt
        ? new Date(d.publishedAt)
        : d.status === "published"
          ? new Date()
          : null,
      readingMinutes: d.readingMinutes,
      seoTitle: d.seoTitle ?? null,
      seoDescription: d.seoDescription ?? null,
      ogImageUrl: d.ogImageUrl || null,
      canonicalUrl: d.canonicalUrl || null,
      noindex: d.noindex ?? false,
      twitterCard: d.twitterCard ?? "summary_large_image",
      lastEditedBy: g.session.email,
    },
  });
  logAction({
    actor: g.session.email,
    action: "update",
    entity: "BlogPost",
    entityId: row.id,
    summary: row.title,
  });
  bumpTags(CACHE_TAGS.blog, CACHE_TAGS.homepage);
  return NextResponse.json({ message: "ok", post: row });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  await prisma.blogPost.delete({ where: { id } });
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "BlogPost",
    entityId: id,
  });
  bumpTags(CACHE_TAGS.blog, CACHE_TAGS.homepage);
  return NextResponse.json({ message: "ok" });
}
