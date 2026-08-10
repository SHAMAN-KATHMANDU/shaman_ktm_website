export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { SaleDraftSchema } from "@/lib/validation/schemas";
import { createSaleDraft, listSales } from "@/lib/sales";
import type { SaleChannel, SaleStatus } from "@/lib/sales/constants";
import { requireActingStaff, resolveShowroomForStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// The sales spine. Every channel lands here; reports are filters over it.
// POST creates a DRAFT only — stock moves at confirm, never on entry.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const result = await listSales({
    channel: (searchParams.get("channel") as SaleChannel | null) ?? undefined,
    status: (searchParams.get("status") as SaleStatus | null) ?? undefined,
    showroomKey: searchParams.get("showroomKey") ?? undefined,
    crmLeadId: searchParams.get("crmLeadId") ?? undefined,
    customerId: searchParams.get("customerId") ?? undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    page: Number(searchParams.get("page") ?? 1),
    limit: Number(searchParams.get("limit") ?? 100),
  });

  return NextResponse.json({ message: "ok", ...result });
}

export async function POST(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, SaleDraftSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const d = parsed.data;
    // A staff member with a default showroom doesn't have to restate it; a
    // floater must send one explicitly (same rule the bots follow).
    const showroomKey =
      d.channel === "showroom"
        ? await resolveShowroomForStaff(staff, d.showroomKey)
        : (d.showroomKey ?? null);

    const sale = await createSaleDraft(
      {
        channel: d.channel,
        showroomKey,
        customerId: d.customerId ?? null,
        crmLeadId: d.crmLeadId ?? null,
        lines: d.lines.map((l) => ({
          productId: l.productId,
          variationId: l.variationId ?? null,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineDiscount: l.lineDiscount,
          note: l.note ?? null,
        })),
        discountAmount: d.discountAmount,
        deliveryFee: d.deliveryFee,
        paymentMethodId: d.paymentMethodId ?? null,
        paymentRef: d.paymentRef ?? null,
        paymentEvidenceUrl: d.paymentEvidenceUrl ?? null,
        inputSource: "web_form",
        dateAd: d.dateAd ? new Date(d.dateAd) : undefined,
        notes: d.notes ?? null,
        staff: d.staff,
      },
      staff.id,
    );
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "Sale",
      entityId: sale.id,
      summary: `draft ${sale.channel} sale, NPR ${sale.totalAmount}`,
    });
    return NextResponse.json({ message: "ok", sale }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
