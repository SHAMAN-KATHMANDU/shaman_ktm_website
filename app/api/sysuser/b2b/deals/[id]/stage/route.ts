export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { B2bDealStageSchema } from "@/lib/validation/schemas";
import { changeDealStage, reopenDeal } from "@/lib/b2b";
import { requireActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// The only way to move a deal along the pipeline. Every call appends a dated,
// attributed row — "samples sent on the 4th, quoted on the 9th" is the fact
// worth reporting, and the current stage alone would lose it.

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, B2bDealStageSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const { toStage, note, reopen, linkedSaleId } = parsed.data;
    const deal = reopen
      ? await reopenDeal({
          dealId: id,
          toStage,
          changedByStaffId: staff.id,
          note: note ?? null,
        })
      : await changeDealStage({
          dealId: id,
          toStage,
          changedByStaffId: staff.id,
          note: note ?? null,
          ...(linkedSaleId !== undefined ? { linkedSaleId } : {}),
        });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "B2bDeal",
      entityId: deal.id,
      summary: `stage → ${toStage}${reopen ? " (reopened)" : ""}`,
    });
    return NextResponse.json({ message: "ok", deal });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
