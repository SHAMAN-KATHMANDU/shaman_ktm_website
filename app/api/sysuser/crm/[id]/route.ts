export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { CrmLeadSchema } from "@/lib/validation/schemas";
import { getLead, updateLeadDetails } from "@/lib/crm";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  try {
    const lead = await getLead(id);
    return NextResponse.json({ message: "ok", lead });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}

// Detail edits only. Status moves go to PATCH /crm/[id]/status so that every
// status change is dated and attributed in CrmLeadStatusHistory.
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, CrmLeadSchema.omit({ status: true }).partial());
  if (!parsed.ok) return parsed.response;

  try {
    const d = parsed.data;
    const lead = await updateLeadDetails(id, {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.phone !== undefined ? { phone: d.phone } : {}),
      ...(d.phoneAlt !== undefined ? { phoneAlt: d.phoneAlt || null } : {}),
      ...(d.email !== undefined ? { email: d.email || null } : {}),
      ...(d.sourceId !== undefined ? { sourceId: d.sourceId } : {}),
      ...(d.interest !== undefined ? { interest: d.interest } : {}),
      ...(d.askedLocation !== undefined
        ? { askedLocation: d.askedLocation }
        : {}),
      ...(d.willVisit !== undefined ? { willVisit: d.willVisit } : {}),
      ...(d.visitDate !== undefined
        ? { visitDate: d.visitDate ? new Date(d.visitDate) : null }
        : {}),
      ...(d.followUpDate !== undefined
        ? { followUpDate: d.followUpDate ? new Date(d.followUpDate) : null }
        : {}),
      ...(d.assignedStaffId !== undefined
        ? { assignedStaffId: d.assignedStaffId || null }
        : {}),
      ...(d.showroomKey !== undefined
        ? { showroomKey: d.showroomKey || null }
        : {}),
      ...(d.notes !== undefined ? { notes: d.notes || null } : {}),
      ...(d.evidenceUrl !== undefined
        ? { evidenceUrl: d.evidenceUrl || null }
        : {}),
    });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "CrmLead",
      entityId: lead.id,
      summary: `${lead.name} details updated`,
    });
    return NextResponse.json({ message: "ok", lead });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
