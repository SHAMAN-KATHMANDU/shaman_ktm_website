export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";

/** Inventory operations need every active pool, including the non-public Online warehouse. */
export async function GET() {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;
  const pools = await prisma.showroom.findMany({
    where: { active: true },
    select: { key: true, name: true, type: true },
    orderBy: [{ type: "asc" }, { position: "asc" }, { name: "asc" }],
  });
  return NextResponse.json({ message: "ok", pools });
}
