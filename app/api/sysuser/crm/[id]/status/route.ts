export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { CrmLeadStatusSchema } from "@/lib/validation/schemas";
import { changeLeadStatus, reopenLead } from "@/lib/crm";
import { requireActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// The only way to move a lead's status. Every call appends a dated, attributed
// CrmLeadStatusHistory row in the same transaction as the update — history is
// never reconstructed after the fact, and never overwritten.

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, CrmLeadStatusSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const { toStatus, note, reopen } = parsed.data;
    const lead = reopen
      ? await reopenLead({
          leadId: id,
          toStatus,
          changedByStaffId: staff.id,
          note: note ?? null,
        })
      : await changeLeadStatus({
          leadId: id,
          toStatus,
          changedByStaffId: staff.id,
          note: note ?? null,
        });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "CrmLead",
      entityId: lead.id,
      summary: `status → ${toStatus}${reopen ? " (reopened)" : ""}`,
    });
    return NextResponse.json({ message: "ok", lead });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
