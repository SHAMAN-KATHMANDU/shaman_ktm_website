export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { BlogCategorySchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { slug } = await ctx.params;
  const parsed = await parseJson(req, BlogCategorySchema);
  if (!parsed.ok) return parsed.response;
  const row = await prisma.blogCategory.update({
    where: { slug },
    data: parsed.data,
  });
  logAction({
    actor: g.session.email,
    action: "update",
    entity: "BlogCategory",
    entityId: row.slug,
    summary: row.name,
  });
  bumpTags(CACHE_TAGS.blog, CACHE_TAGS.blogCategories);
  return NextResponse.json({ message: "ok", category: row });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { slug } = await ctx.params;
  await prisma.blogCategory.delete({ where: { slug } });
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "BlogCategory",
    entityId: slug,
  });
  bumpTags(CACHE_TAGS.blog, CACHE_TAGS.blogCategories);
  return NextResponse.json({ message: "ok" });
}
