export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { MarketingImportSchema } from "@/lib/validation/schemas";
import { importAdSpendCsv, importSocialMetricsCsv } from "@/lib/marketing";
import { findActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// CSV import for the two exported surfaces. Rows that can't be trusted are
// SKIPPED and reported rather than guessed — most importantly an ad-spend row
// with no FX rate, which would otherwise file AUD numbers as NPR.

export async function POST(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, MarketingImportSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await findActingStaff(g.session.userId);
    const { kind, csv } = parsed.data;
    const result =
      kind === "ad_spend"
        ? await importAdSpendCsv(csv, staff?.id ?? null)
        : await importSocialMetricsCsv(csv);

    logAction({
      actor: g.session.email,
      action: "bulk_update",
      entity: kind === "ad_spend" ? "AdSpendDaily" : "SocialMetricsMonthly",
      summary: `CSV import: ${result.imported} imported, ${result.skipped.length} skipped`,
    });
    return NextResponse.json({ message: "ok", ...result });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
