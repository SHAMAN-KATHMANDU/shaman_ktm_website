export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { CrmFollowupSchema } from "@/lib/validation/schemas";
import { addFollowup } from "@/lib/crm";
import { requireActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Log a follow-up attempt against a lead. `gotResponse` is what makes "we
// chased 14 leads, 3 replied" answerable from records rather than memory.

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, CrmFollowupSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const followup = await addFollowup({
      leadId: id,
      staffId: staff.id,
      channel: parsed.data.channel,
      followupAt: parsed.data.followupAt
        ? new Date(parsed.data.followupAt)
        : undefined,
      gotResponse: parsed.data.gotResponse,
      notes: parsed.data.notes ?? null,
    });
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "CrmFollowup",
      entityId: followup.id,
      summary: `${followup.channel} · ${followup.gotResponse ? "replied" : "no reply"}`,
    });
    return NextResponse.json({ message: "ok", followup }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
