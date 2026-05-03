export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { PageSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { slug } = await ctx.params;
  const row = await prisma.page.findUnique({ where: { slug } });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", page: row });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { slug } = await ctx.params;
  const parsed = await parseJson(req, PageSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const row = await prisma.page.update({
    where: { slug },
    data: {
      slug: d.slug,
      title: d.title,
      bodyMarkdown: d.bodyMarkdown,
      publishedAt: d.publishedAt ? new Date(d.publishedAt) : undefined,
      seoTitle: d.seoTitle ?? null,
      seoDescription: d.seoDescription ?? null,
    },
  });
  bumpTags(CACHE_TAGS.pages);
  return NextResponse.json({ message: "ok", page: row });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { slug } = await ctx.params;
  await prisma.page.delete({ where: { slug } });
  bumpTags(CACHE_TAGS.pages);
  return NextResponse.json({ message: "ok" });
}
