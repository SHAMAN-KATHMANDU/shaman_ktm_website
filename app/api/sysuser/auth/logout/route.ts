export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { clearSession, getSession } from "@/lib/auth/session";
import { logAction } from "@/lib/audit";

export async function POST() {
  const s = await getSession();
  const actor = s.email;
  const userId = s.userId;
  await clearSession();
  if (actor) {
    logAction({
      actor,
      action: "logout",
      entity: "AdminUser",
      entityId: userId,
    });
  }
  return NextResponse.json({ message: "ok" });
}
