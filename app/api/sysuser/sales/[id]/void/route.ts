export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { SaleVoidSchema } from "@/lib/validation/schemas";
import { voidSale } from "@/lib/sales";
import { requireActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Void a confirmed sale. The original is never edited: this appends a reversing
// sale (amounts negated, stock put back) and marks the original void, so the
// month it happened in keeps its figure and the correction lands in today's.

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, SaleVoidSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const { voided, reversal } = await voidSale({
      saleId: id,
      voidedByStaffId: staff.id,
      reason: parsed.data.reason,
    });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "Sale",
      entityId: voided.id,
      summary: `voided ${voided.saleNo} via reversal ${reversal.saleNo}: ${parsed.data.reason}`,
    });
    return NextResponse.json({ message: "ok", sale: voided, reversal });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
