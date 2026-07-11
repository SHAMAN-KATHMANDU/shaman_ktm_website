export const dynamic = "force-dynamic";

// Admin: GET NCM branches list (cached, 24h TTL). Returns empty array on
// NCM API error to avoid breaking the booking UI.

import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/guard";
import { getCachedBranches } from "@/lib/ncm/branches";

export async function GET(_req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;

  try {
    const branches = await getCachedBranches();
    return NextResponse.json({
      message: "ok",
      branches: branches.map((b) => ({
        id: b.id,
        code: b.code,
        name: b.name,
        district: b.district,
      })),
    });
  } catch (err) {
    // Graceful fallback: return empty list on transient NCM API errors
    // so the admin UI still renders; user can retry later.
    console.error(
      "NCM branches fetch failed:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ message: "ok", branches: [] });
  }
}
