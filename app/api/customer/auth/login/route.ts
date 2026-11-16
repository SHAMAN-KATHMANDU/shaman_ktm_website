export const dynamic = "force-dynamic";

// Customer login — mirrors /api/sysuser/auth/login (rate limiting via
// login_failed log rows, opaque error messages, session-fixation defence)
// but against the Customer table and sk_customer cookie.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import {
  clearCustomerSession,
  setCustomerSession,
} from "@/lib/auth/customer-session";
import { logCustomerAction } from "@/lib/audit";
import { clientIp, rateLimit } from "@/lib/oauth/rate-limit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Same limiter as the admin login: keyed on email + client IP so nobody can
// lock a customer out from elsewhere; failures are awaited so the next
// request counts them; the in-memory limiter catches parallel guesses.
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_FAILS = 5;
const RATE_MAX_ATTEMPTS = 10;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 400 },
    );
  }
  const email = parsed.data.email.toLowerCase();

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
  if (!rateLimit(`customer-login:${email}:${ip}`, RATE_MAX_ATTEMPTS, RATE_WINDOW_MS)) {
    return tooMany();
  }

  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recentFails = await prisma.customerLog.count({
    where: {
      action: "login_failed",
      actor: email,
      summary: { endsWith: ipTag },
      createdAt: { gte: since },
    },
  });
  if (recentFails >= RATE_MAX_FAILS) return tooMany();

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) {
    await logCustomerAction({
      actor: email,
      action: "login_failed",
      entity: "Customer",
      summary: `unknown email${ipTag}`,
    });
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  const ok = await verifyPassword(parsed.data.password, customer.passwordHash);
  if (!ok) {
    await logCustomerAction({
      actor: customer.email,
      action: "login_failed",
      entity: "Customer",
      entityId: customer.id,
      summary: `wrong password${ipTag}`,
    });
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  await clearCustomerSession();
  await setCustomerSession(customer);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { lastLoginAt: new Date() },
  });
  logCustomerAction({
    actor: customer.email,
    action: "login",
    entity: "Customer",
    entityId: customer.id,
  });

  return NextResponse.json({
    message: "ok",
    user: {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      phone: customer.phone ?? undefined,
    },
  });
}
