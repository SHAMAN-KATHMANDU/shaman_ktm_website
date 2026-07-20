export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { MemberLeadStatusSchema } from "@/lib/validation/schemas";
import { logAction } from "@/lib/audit";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, MemberLeadStatusSchema);
  if (!parsed.ok) return parsed.response;

  const updated = await prisma.memberLead.update({
    where: { id },
    data: {
      status: parsed.data.status,
      note: parsed.data.note ?? undefined,
    },
  });
  logAction({
    actor: g.session.email,
    action: "update",
    entity: "MemberLead",
    entityId: id,
    summary: `status: ${updated.status}`,
  });
  return NextResponse.json({ message: "ok", lead: updated });
}
