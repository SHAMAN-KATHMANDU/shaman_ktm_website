export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { PageSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const rows = await prisma.page.findMany({ orderBy: { slug: "asc" } });
  return NextResponse.json({ message: "ok", pages: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, PageSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;

  const slugClash = await prisma.page.findUnique({
    where: { slug: d.slug },
    select: { slug: true },
  });
  if (slugClash) {
    return NextResponse.json(
      { message: `A page with slug "${d.slug}" already exists.` },
      { status: 409 },
    );
  }

  const row = await prisma.page.create({
    data: {
      slug: d.slug,
      title: d.title,
      titleNe: d.titleNe ?? null,
      bodyMarkdown: d.bodyMarkdown,
      bodyMarkdownNe: d.bodyMarkdownNe ?? null,
      publishedAt: d.publishedAt ? new Date(d.publishedAt) : new Date(),
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
    action: "create",
    entity: "Page",
    entityId: row.slug,
    summary: row.title,
  });
  bumpTags(CACHE_TAGS.pages);
  return NextResponse.json({ message: "ok", page: row });
}
