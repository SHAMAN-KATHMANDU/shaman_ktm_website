export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { SocialMetricsSchema } from "@/lib/validation/schemas";
import { listSocialMetrics, upsertSocialMetrics } from "@/lib/marketing";
import type { SocialPlatform } from "@/lib/marketing/constants";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Monthly social figures. PUT rather than POST: one row per month per platform,
// so re-filing a month corrects it instead of creating a second version.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const result = await listSocialMetrics({
    platform:
      (searchParams.get("platform") as SocialPlatform | null) ?? undefined,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    page: Number(searchParams.get("page") ?? 1),
    limit: Number(searchParams.get("limit") ?? 100),
  });

  return NextResponse.json({ message: "ok", ...result });
}

export async function PUT(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, SocialMetricsSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const d = parsed.data;
    const row = await upsertSocialMetrics({
      periodAd: new Date(d.periodAd),
      periodBs: d.periodBs,
      platform: d.platform,
      followers: d.followers ?? null,
      newFollowers: d.newFollowers ?? null,
      posts: d.posts ?? null,
      stories: d.stories ?? null,
      reels: d.reels ?? null,
      reach: d.reach ?? null,
      impressions: d.impressions ?? null,
      profileVisits: d.profileVisits ?? null,
      avgLikes: d.avgLikes ?? null,
      avgComments: d.avgComments ?? null,
      avgSharesSaves: d.avgSharesSaves ?? null,
      engagementRate: d.engagementRate ?? null,
    });
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "SocialMetricsMonthly",
      entityId: row.id,
      summary: `${row.platform} ${row.periodBs}`,
    });
    return NextResponse.json({ message: "ok", metrics: row });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
