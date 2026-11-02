export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { AdSpendSchema } from "@/lib/validation/schemas";
import { listAdSpend, recordAdSpend } from "@/lib/marketing";
import type { AdPlatform } from "@/lib/marketing/constants";
import { findActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Daily ad spend. The Meta export is in AUD, so a row keeps its original
// amount, currency and rate, and the NPR figure reports read is derived from
// them — see lib/marketing.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const result = await listAdSpend({
    platform: (searchParams.get("platform") as AdPlatform | null) ?? undefined,
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

  const parsed = await parseJson(req, AdSpendSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await findActingStaff(g.session.userId);
    const d = parsed.data;
    const row = await recordAdSpend(
      {
        dateAd: new Date(d.dateAd),
        platform: d.platform,
        campaignName: d.campaignName ?? null,
        amountSpent: d.amountSpent,
        currency: d.currency,
        fxRate: d.fxRate,
        impressions: d.impressions ?? null,
        reach: d.reach ?? null,
        frequency: d.frequency ?? null,
        results: d.results ?? null,
        costPerResult: d.costPerResult ?? null,
        messagingConversations: d.messagingConversations ?? null,
      },
      staff?.id ?? null,
    );
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "AdSpendDaily",
      entityId: row.id,
      summary: `${d.amountSpent} ${row.currency} → NPR ${row.amountNpr} · ${row.platform}`,
    });
    return NextResponse.json({ message: "ok", spend: row }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
