export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { CategorySchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, CategorySchema);
  if (!parsed.ok) return parsed.response;
  const row = await prisma.category.update({
    where: { id },
    data: {
      slug: parsed.data.slug,
      name: parsed.data.name,
      nameNe: parsed.data.nameNe ?? null,
      imageUrl: parsed.data.imageUrl ?? null,
      position: parsed.data.position,
    },
  });
  logAction({
    actor: g.session.email,
    action: "update",
    entity: "Category",
    entityId: row.id,
    summary: row.name,
  });
  bumpTags(CACHE_TAGS.categories, CACHE_TAGS.products);
  return NextResponse.json({ message: "ok", category: row });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  await prisma.category.delete({ where: { id } });
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "Category",
    entityId: id,
  });
  bumpTags(CACHE_TAGS.categories, CACHE_TAGS.products);
  return NextResponse.json({ message: "ok" });
}
