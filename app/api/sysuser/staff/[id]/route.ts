export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { StaffSchema } from "@/lib/validation/schemas";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const staff = await prisma.staff.findUnique({
    where: { id },
    include: {
      defaultShowroom: { select: { key: true, name: true } },
      adminUser: { select: { id: true, email: true, role: true } },
    },
  });
  if (!staff) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ message: "ok", staff });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, StaffSchema.partial());
  if (!parsed.ok) return parsed.response;

  try {
    const existing = await prisma.staff.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    const data = parsed.data;
    if (data.defaultShowroomKey) {
      const showroom = await prisma.showroom.findUnique({
        where: { key: data.defaultShowroomKey },
        select: { key: true },
      });
      if (!showroom) {
        const keys = await prisma.showroom.findMany({ select: { key: true } });
        throw new CmsError("Showroom not found", {
          statusCode: 404,
          availableOptions: keys.map((s) => s.key),
          referenceKind: "defaultShowroomKey",
        });
      }
    }
    const staff = await prisma.staff.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.telegramUserId !== undefined
          ? { telegramUserId: data.telegramUserId || null }
          : {}),
        ...(data.defaultShowroomKey !== undefined
          ? { defaultShowroomKey: data.defaultShowroomKey || null }
          : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.adminUserId !== undefined
          ? { adminUserId: data.adminUserId || null }
          : {}),
      },
    });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "Staff",
      entityId: staff.id,
      summary: `Staff "${staff.name}" updated`,
    });
    return NextResponse.json({ message: "ok", staff });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
