export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { CategorySchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const rows = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ message: "ok", categories: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, CategorySchema);
  if (!parsed.ok) return parsed.response;
  const row = await prisma.category.create({
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      imageUrl: parsed.data.imageUrl ?? null,
      position: parsed.data.position,
    },
  });
  bumpTags(CACHE_TAGS.categories);
  return NextResponse.json({ message: "ok", category: row });
}
