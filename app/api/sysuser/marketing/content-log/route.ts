export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { ContentLogSchema } from "@/lib/validation/schemas";
import { appendContentLog, listContentLog } from "@/lib/marketing";
import type { SocialPlatform } from "@/lib/marketing/constants";
import { findActingStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// What was published and how it performed. Columns match the existing
// marketing-report content log, so the old CSV imports without reshaping.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const result = await listContentLog({
    platform:
      (searchParams.get("platform") as SocialPlatform | null) ?? undefined,
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

  const parsed = await parseJson(req, ContentLogSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await findActingStaff(g.session.userId);
    const d = parsed.data;
    const entry = await appendContentLog(
      {
        date: d.date ? new Date(d.date) : undefined,
        platform: d.platform,
        contentType: d.contentType,
        topic: d.topic ?? null,
        hashtags: d.hashtags ?? null,
        reach: d.reach ?? null,
        impressions: d.impressions ?? null,
        likes: d.likes ?? null,
        comments: d.comments ?? null,
        shares: d.shares ?? null,
        saves: d.saves ?? null,
        engagementRate: d.engagementRate ?? null,
        linkClicks: d.linkClicks ?? null,
        notes: d.notes ?? null,
      },
      staff?.id ?? null,
    );
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "ContentLog",
      entityId: entry.id,
      summary: `${entry.platform} ${entry.contentType}`,
    });
    return NextResponse.json({ message: "ok", entry }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
