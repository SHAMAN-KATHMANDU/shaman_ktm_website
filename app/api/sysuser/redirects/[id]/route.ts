export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { RedirectSchema } from "@/lib/validation/schemas";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, RedirectSchema);
  if (!parsed.ok) return parsed.response;
  const row = await prisma.redirect.update({
    where: { id },
    data: { ...parsed.data, note: parsed.data.note ?? null },
  });
  logAction({
    actor: g.session.email,
    action: "update",
    entity: "Redirect",
    entityId: row.id,
    summary: `${row.fromPath} → ${row.toPath}`,
  });
  return NextResponse.json({ message: "ok", redirect: row });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  await prisma.redirect.delete({ where: { id } });
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "Redirect",
    entityId: id,
  });
  return NextResponse.json({ message: "ok" });
}
