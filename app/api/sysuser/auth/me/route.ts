export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET() {
  const s = await getSession();
  if (!s.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  // Role is included so the admin shell can filter nav groups client-side
  // (server-side enforcement stays in requireRole on every route).
  const user = await prisma.adminUser.findUnique({
    where: { id: s.userId },
    select: { role: true },
  });
  return NextResponse.json({
    message: "ok",
    user: { email: s.email, name: s.name, role: user?.role ?? "staff" },
  });
}
