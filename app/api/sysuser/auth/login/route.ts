export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { clearSession, setSession } from "@/lib/auth/session";
import { logAction } from "@/lib/audit";
import { clientIp, rateLimit } from "@/lib/oauth/rate-limit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Rate limit: 5 failed attempts in 15 minutes per email AND client IP trigger
// a 429. Keyed on the pair so a stranger guessing from elsewhere cannot lock
// the owner out. Failures are sourced from AdminLog (action=login_failed,
// IP in the summary) and awaited, so the next request sees them; parallel
// guesses that all read the count before any write lands are caught by the
// in-memory limiter, checked before any password is verified.
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_FAILS = 5;
const RATE_MAX_ATTEMPTS = 10;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 400 },
    );
  }

  const ip = clientIp(req);
  const ipTag = ` · ip ${ip}`;
  const tooMany = () =>
    NextResponse.json(
      {
        message:
          "Too many failed attempts — wait 15 minutes before trying again.",
      },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  if (
    !rateLimit(
      `admin-login:${parsed.data.email}:${ip}`,
      RATE_MAX_ATTEMPTS,
      RATE_WINDOW_MS,
    )
  ) {
    return tooMany();
  }

  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recentFails = await prisma.adminLog.count({
    where: {
      action: "login_failed",
      actor: parsed.data.email,
      summary: { endsWith: ipTag },
      createdAt: { gte: since },
    },
  });
  if (recentFails >= RATE_MAX_FAILS) return tooMany();

  const user = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) {
    await logAction({
      actor: parsed.data.email,
      action: "login_failed",
      entity: "AdminUser",
      summary: `unknown email${ipTag}`,
    });
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    await logAction({
      actor: user.email,
      action: "login_failed",
      entity: "AdminUser",
      entityId: user.id,
      summary: `wrong password${ipTag}`,
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
