export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { SaleConfirmSchema } from "@/lib/validation/schemas";
import { confirmSale } from "@/lib/sales";
import { requireActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Confirm a draft: allocates its sale number and decrements the showroom pool
// once per line, all-or-nothing. From here the sale is immutable.

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, SaleConfirmSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const sale = await confirmSale({
      saleId: id,
      showroomKey: parsed.data.showroomKey ?? null,
      paymentMethodId: parsed.data.paymentMethodId,
      paymentRef: parsed.data.paymentRef,
      paymentEvidenceUrl: parsed.data.paymentEvidenceUrl,
      confirmedByStaffId: staff.id,
      closeCrmLead: parsed.data.closeCrmLead,
    });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "Sale",
      entityId: sale.id,
      summary: `confirmed ${sale.saleNo} · NPR ${sale.totalAmount} · ${sale.showroomKey}`,
    });
    return NextResponse.json({ message: "ok", sale });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
