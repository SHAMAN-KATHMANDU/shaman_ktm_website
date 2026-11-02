export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { CrmLeadSchema } from "@/lib/validation/schemas";
import { createLead, listLeads, countLeadsByStatus } from "@/lib/crm";
import type { LeadInterest, LeadStatus } from "@/lib/crm/constants";
import { requireActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// CRM leads. Staff+ may read and record; the per-status counts returned here
// are what replace the hand-typed WhatsApp daily tally.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = (searchParams.get("status") as LeadStatus | null) ?? undefined;
  // Everything except status: the tab counts must span all buckets.
  const filters = {
    interest: (searchParams.get("interest") as LeadInterest | null) ?? undefined,
    sourceId: searchParams.get("sourceId") ?? undefined,
    showroomKey: searchParams.get("showroomKey") ?? undefined,
    assignedStaffId: searchParams.get("assignedStaffId") ?? undefined,
    q: searchParams.get("q")?.trim() || undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };

  const [list, counts] = await Promise.all([
    listLeads({
      ...filters,
      status,
      page: Number(searchParams.get("page") ?? 1),
      limit: Number(searchParams.get("limit") ?? 100),
    }),
    countLeadsByStatus(filters),
  ]);

  return NextResponse.json({ message: "ok", ...list, counts });
}

export async function POST(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, CrmLeadSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const d = parsed.data;
    const lead = await createLead(
      {
        name: d.name,
        phone: d.phone,
        phoneAlt: d.phoneAlt || null,
        email: d.email || null,
        sourceId: d.sourceId,
        interest: d.interest,
        status: d.status,
        askedLocation: d.askedLocation,
        willVisit: d.willVisit,
        visitDate: d.visitDate ? new Date(d.visitDate) : null,
        followUpDate: d.followUpDate ? new Date(d.followUpDate) : null,
        assignedStaffId: d.assignedStaffId || null,
        showroomKey: d.showroomKey || null,
        notes: d.notes || null,
        evidenceUrl: d.evidenceUrl || null,
      },
      staff.id,
    );
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "CrmLead",
      entityId: lead.id,
      summary: `${lead.name} · ${lead.interest} · ${lead.status}`,
    });
    return NextResponse.json({ message: "ok", lead }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
