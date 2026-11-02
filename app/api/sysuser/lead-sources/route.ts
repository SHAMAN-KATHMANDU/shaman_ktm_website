export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guard";

// Lead-source vocabulary (SMS, WhatsApp, Instagram DM, Walk-in, …) — the
// "how did they reach us" list, seeded in prisma/seed.ts and read by the CRM
// entry forms and the leads bot. Editing the list is editor-only and lives in
// the seed for now; this endpoint is read-only.

export async function GET(req: Request) {
  const g = await requireRole("staff");
  if (!g.ok) return g.response;

  const { searchParams } = new URL(req.url);
  const includeInactive = searchParams.get("includeInactive") === "1";

  const leadSources = await prisma.leadSource.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { label: "asc" },
  });

  return NextResponse.json({ message: "ok", leadSources });
}
