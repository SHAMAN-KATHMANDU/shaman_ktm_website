export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { FootfallSchema } from "@/lib/validation/schemas";
import { listFootfall, recordFootfall } from "@/lib/marketing";
import type { FootfallSource } from "@/lib/marketing/constants";
import { requireActingStaff, resolveShowroomForStaff } from "@/lib/staff";
import { logAction } from "@/lib/audit";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

// Showroom footfall. The list returns derived period totals and an entry-based
// conversion rate, so a monthly figure is a query rather than a tally.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const converted = searchParams.get("convertedToSale");

  const result = await listFootfall({
    showroomKey: searchParams.get("showroomKey") ?? undefined,
    source: (searchParams.get("source") as FootfallSource | null) ?? undefined,
    convertedToSale:
      converted === null ? undefined : converted === "1" || converted === "true",
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

  const parsed = await parseJson(req, FootfallSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const staff = await requireActingStaff(g.session.userId, g.session.email);
    const d = parsed.data;
    // A floater must say which showroom; everyone else can rely on their default.
    const showroomKey =
      (await resolveShowroomForStaff(staff, d.showroomKey)) ?? d.showroomKey;

    const entry = await recordFootfall(
      {
        showroomKey,
        dateAd: d.dateAd ? new Date(d.dateAd) : undefined,
        visitorsTotal: d.visitorsTotal,
        individuals: d.individuals ?? null,
        groups: d.groups ?? null,
        source: d.source,
        convertedToSale: d.convertedToSale,
        linkedSaleId: d.linkedSaleId ?? null,
        notes: d.notes ?? null,
        inquiries: d.inquiries?.map((q) => ({
          variationId: q.variationId ?? null,
          freeTextProduct: q.freeTextProduct ?? null,
          inquiryType: q.inquiryType,
        })),
      },
      staff.id,
    );
    logAction({
      actor: g.session.email,
      action: "create",
      entity: "FootfallEntry",
      entityId: entry.id,
      summary: `${entry.visitorsTotal} visitors · ${entry.source} · ${entry.showroomKey}`,
    });
    return NextResponse.json({ message: "ok", entry }, { status: 201 });
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }
}
