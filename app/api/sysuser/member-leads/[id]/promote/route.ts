export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { MemberLeadPromoteSchema } from "@/lib/validation/schemas";
import { promoteMemberLead } from "@/lib/crm";
import { requireActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Copy a Member Circle signup forward into the CRM pipeline. One-way and
// one-time: the MemberLead row keeps its own queue and status, and a second
// promotion of the same signup is rejected so reports can't double-count.

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, MemberLeadPromoteSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const lead = await promoteMemberLead({
      memberLeadId: id,
      createdByStaffId: staff.id,
      sourceId: parsed.data.sourceId,
      interest: parsed.data.interest,
    });
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "CrmLead",
      entityId: lead.id,
      summary: `Promoted member lead ${id} → CRM (${lead.name})`,
    });
    return NextResponse.json({ message: "ok", lead }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
