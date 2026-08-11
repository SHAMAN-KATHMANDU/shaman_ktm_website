export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";

export async function GET(req: Request) {
  const g = await requireRole("owner");
  if (!g.ok) return g.response;
  const { searchParams } = new URL(req.url);
  const take = Math.min(200, Number(searchParams.get("limit") ?? 50) || 50);
  const rows = await prisma.adminLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
  return NextResponse.json({ message: "ok", entries: rows });
}
