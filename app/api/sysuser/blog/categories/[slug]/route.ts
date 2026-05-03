import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { BlogCategorySchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const dynamic = "force-dynamic";

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
  bumpTags(CACHE_TAGS.blog, CACHE_TAGS.blogCategories);
  return NextResponse.json({ message: "ok" });
}
