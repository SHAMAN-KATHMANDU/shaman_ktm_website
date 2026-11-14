export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/guard";

export async function GET() {
  // Same check as every other admin route, so a deleted account is logged out
  // here too instead of being reported as "staff". viewer is the lowest rung.
  const g = await requireRole("viewer");
  if (!g.ok) return g.response;
  const s = await getSession();
  // Role is included so the admin shell can filter nav groups client-side
  // (server-side enforcement stays in requireRole on every route).
  return NextResponse.json({
    message: "ok",
    user: { email: g.session.email, name: s.name, role: g.role },
  });
}
