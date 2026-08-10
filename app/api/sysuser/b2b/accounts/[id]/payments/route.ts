export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { B2bPaymentSchema } from "@/lib/validation/schemas";
import { listPayments, outstandingBalance, recordPayment } from "@/lib/b2b";
import { requireActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Payments against a trade account, plus the balance they roll up to. An
// advance (money before delivery) is flagged so a credit balance reads as
// credit rather than looking like a mistake.

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const [result, balance] = await Promise.all([
    listPayments({
      b2bAccountId: id,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: Number(searchParams.get("page") ?? 1),
      limit: Number(searchParams.get("limit") ?? 100),
    }),
    outstandingBalance(id),
  ]);

  return NextResponse.json({ message: "ok", ...result, balance });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { id } = await ctx.params;
  const parsed = await parseJson(req, B2bPaymentSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const d = parsed.data;
    const payment = await recordPayment({
      b2bAccountId: id,
      amount: d.amount,
      saleId: d.saleId || null,
      paidAt: d.paidAt ? new Date(d.paidAt) : undefined,
      paymentMethodId: d.paymentMethodId || null,
      isAdvance: d.isAdvance,
      reference: d.reference || null,
      note: d.note || null,
      recordedByStaffId: staff.id,
    });
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "B2bPayment",
      entityId: payment.id,
      summary: `NPR ${payment.amount}${payment.isAdvance ? " (advance)" : ""} on account ${id}`,
    });
    const balance = await outstandingBalance(id);
    return NextResponse.json({ message: "ok", payment, balance }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
