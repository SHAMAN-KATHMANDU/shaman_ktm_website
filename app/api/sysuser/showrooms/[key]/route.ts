export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { ShowroomSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ key: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { key } = await ctx.params;
  const parsed = await parseJson(req, ShowroomSchema);
  if (!parsed.ok) return parsed.response;
  const d = parsed.data;
  const row = await prisma.showroom.update({
    where: { key },
    data: {
      key: d.key,
      name: d.name,
      nameNe: d.nameNe ?? null,
      address: d.address,
      addressNe: d.addressNe ?? null,
      whatsapp: d.whatsapp,
      mapEmbedUrl: d.mapEmbedUrl ?? null,
      position: d.position,
    },
  });
  logAction({
    actor: g.session.email,
    action: "update",
    entity: "Showroom",
    entityId: row.key,
    summary: row.name,
  });
  bumpTags(CACHE_TAGS.showrooms);
  return NextResponse.json({ message: "ok", showroom: row });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ key: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { key } = await ctx.params;
  await prisma.showroom.delete({ where: { key } });
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "Showroom",
    entityId: key,
  });
  bumpTags(CACHE_TAGS.showrooms);
  return NextResponse.json({ message: "ok" });
}
