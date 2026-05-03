export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { PageSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const dynamic = "force-dynamic";

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
  const row = await prisma.page.create({
    data: {
      slug: d.slug,
      title: d.title,
      bodyMarkdown: d.bodyMarkdown,
      publishedAt: d.publishedAt ? new Date(d.publishedAt) : new Date(),
      seoTitle: d.seoTitle ?? null,
      seoDescription: d.seoDescription ?? null,
    },
  });
  bumpTags(CACHE_TAGS.pages);
  return NextResponse.json({ message: "ok", page: row });
}
