export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { ElementSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { slug } = await ctx.params;
  const row = await prisma.element.findUnique({ where: { slug } });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", element: row });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { slug } = await ctx.params;
  const parsed = await parseJson(req, ElementSchema.partial({ slug: true }));
  if (!parsed.ok) return parsed.response;
  const row = await prisma.element.update({
    where: { slug },
    data: { ...parsed.data, slug: parsed.data.slug ?? slug },
  });
  bumpTags(CACHE_TAGS.elements);
  return NextResponse.json({ message: "ok", element: row });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { slug } = await ctx.params;
  await prisma.element.delete({ where: { slug } });
  bumpTags(CACHE_TAGS.elements);
  return NextResponse.json({ message: "ok" });
}
