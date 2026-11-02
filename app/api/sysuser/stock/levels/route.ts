export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { getStockLevels } from "@/lib/stock";

// Current per-showroom pool balances (materialized from the ledger).
// A pool row exists only where that showroom actually stocks the variation —
// showrooms legitimately carry different variation sets.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const result = await getStockLevels({
    variationId: searchParams.get("variationId") ?? undefined,
    showroomKey: searchParams.get("showroomKey") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    limit: Number(searchParams.get("limit") ?? 100),
  });

  return NextResponse.json({ message: "ok", ...result });
}
