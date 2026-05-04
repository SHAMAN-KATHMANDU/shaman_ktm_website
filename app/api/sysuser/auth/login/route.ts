export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { clearSession, setSession } from "@/lib/auth/session";
import { logAction } from "@/lib/audit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Rate limit window: 5 failed attempts in 15 minutes per email triggers a
// 429 lockout. Failures are sourced from AdminLog (action=login_failed),
// which is already populated by this route's failure paths — so the limiter
// has no extra storage to manage and stays consistent across replicas.
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_FAILS = 5;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 400 },
    );
  }

  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recentFails = await prisma.adminLog.count({
    where: {
      action: "login_failed",
      actor: parsed.data.email,
      createdAt: { gte: since },
    },
  });
  if (recentFails >= RATE_MAX_FAILS) {
    return NextResponse.json(
      {
        message:
          "Too many failed attempts — wait 15 minutes before trying again.",
      },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  const user = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) {
    logAction({
      actor: parsed.data.email,
      action: "login_failed",
      entity: "AdminUser",
      summary: "unknown email",
    });
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    logAction({
      actor: user.email,
      action: "login_failed",
      entity: "AdminUser",
      entityId: user.id,
      summary: "wrong password",
    });
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  // Drop any pre-existing session before issuing a new one — defends against
  // session-fixation attacks where an attacker pre-seeds a victim's cookie.
  await clearSession();
  await setSession(user);
  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  logAction({
    actor: user.email,
    action: "login",
    entity: "AdminUser",
    entityId: user.id,
  });
  return NextResponse.json({
    message: "ok",
    user: { email: user.email, name: user.name },
  });
}
