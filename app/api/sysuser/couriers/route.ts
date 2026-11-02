export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";

// Courier vocabulary (inDrive, NCM, Pathao, Self-delivery, Customer pickup) —
// seeded in prisma/seed.ts and read by the delivery-log panel. Read-only, like
// the other lookup endpoints: the list lives in the seed for now.
//
// This is what the Courier table was seeded for in PR 1; until the delivery log
// existed, nothing consumed it.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("includeInactive") === "1";

  const couriers = await prisma.courier.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { label: "asc" },
  });

  return NextResponse.json({ message: "ok", couriers });
}
