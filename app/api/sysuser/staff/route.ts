export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { StaffSchema } from "@/lib/validation/schemas";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Staff directory. Reads are staff+ (entry forms and bots need the list for
// attribution); management (create/edit) is editor+.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const activeParam = searchParams.get("active");

  const staff = await prisma.staff.findMany({
    where:
      activeParam === null ? {} : { active: activeParam === "1" || activeParam === "true" },
    orderBy: { name: "asc" },
    include: {
      defaultShowroom: { select: { key: true, name: true } },
      adminUser: { select: { id: true, email: true, role: true } },
    },
  });

  return NextResponse.json({ message: "ok", staff });
}

export async function POST(req: Request) {
  const g = await requireRole("editor");
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, StaffSchema);
  if (!parsed.ok) return parsed.response;

  try {
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
    const staff = await prisma.staff.create({
      data: {
        name: data.name,
        phone: data.phone || null,
        telegramUserId: data.telegramUserId || null,
        defaultShowroomKey: data.defaultShowroomKey || null,
        active: data.active,
        adminUserId: data.adminUserId || null,
      },
    });
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "Staff",
      entityId: staff.id,
      summary: `Staff "${staff.name}" created`,
    });
    return NextResponse.json({ message: "ok", staff }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
