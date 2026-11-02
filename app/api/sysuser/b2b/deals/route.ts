export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { B2bDealSchema } from "@/lib/validation/schemas";
import { createDeal, listDeals } from "@/lib/b2b";
import type { B2bDealStage } from "@/lib/b2b/constants";
import { requireActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// The deal pipeline. The list also returns value-by-stage, which is the
// target-list view derived from records instead of maintained by hand.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const result = await listDeals({
    b2bAccountId: searchParams.get("b2bAccountId") ?? undefined,
    stage: (searchParams.get("stage") as B2bDealStage | null) ?? undefined,
    ownerStaffId: searchParams.get("ownerStaffId") ?? undefined,
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

  const parsed = await parseJson(req, B2bDealSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const d = parsed.data;
    const deal = await createDeal(
      {
        b2bAccountId: d.b2bAccountId,
        dealName: d.dealName,
        stage: d.stage,
        quoteAmount: d.quoteAmount ?? null,
        expectedCloseDate: d.expectedCloseDate
          ? new Date(d.expectedCloseDate)
          : null,
        ownerStaffId: d.ownerStaffId || null,
        tierApplied: d.tierApplied ?? null,
        notes: d.notes || null,
      },
      staff.id,
    );
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "B2bDeal",
      entityId: deal.id,
      summary: `${deal.dealName} · ${deal.stage}`,
    });
    return NextResponse.json({ message: "ok", deal }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
