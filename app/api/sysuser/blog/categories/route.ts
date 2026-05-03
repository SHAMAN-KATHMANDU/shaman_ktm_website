export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { BlogCategorySchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const rows = await prisma.blogCategory.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ message: "ok", categories: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, BlogCategorySchema);
  if (!parsed.ok) return parsed.response;
  const row = await prisma.blogCategory.create({ data: parsed.data });
  bumpTags(CACHE_TAGS.blog, CACHE_TAGS.blogCategories);
  return NextResponse.json({ message: "ok", category: row });
}
