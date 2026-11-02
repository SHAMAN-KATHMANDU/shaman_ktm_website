export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";

// The controlled payment vocabulary (Cash, HML QR, Muktinath eSewa, …), seeded
// in prisma/seed.ts. Read by the sale entry form and the sales bot so a till
// entry can never invent a new spelling of "cash".

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("includeInactive") === "1";

  const paymentMethods = await prisma.paymentMethodLookup.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: [{ channel: "asc" }, { label: "asc" }],
  });

  return NextResponse.json({ message: "ok", paymentMethods });
}
