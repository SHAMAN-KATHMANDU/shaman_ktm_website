export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { listTiers } from "@/lib/b2b";

// Trade tiers (discount / target margin / commission), seeded from the existing
// Shrawan target list. Read-only here: the numbers are commercial policy, so
// they live in the seed rather than being editable per request.

export async function GET() {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const tiers = await listTiers();
  return NextResponse.json({ message: "ok", tiers });
}
