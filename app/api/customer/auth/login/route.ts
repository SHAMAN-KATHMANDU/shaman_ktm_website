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

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_FAILS = 5;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 400 },
    );
  }
  const email = parsed.data.email.toLowerCase();

  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recentFails = await prisma.customerLog.count({
    where: { action: "login_failed", actor: email, createdAt: { gte: since } },
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

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (!customer) {
    logCustomerAction({
      actor: email,
      action: "login_failed",
      entity: "Customer",
      summary: "unknown email",
    });
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  const ok = await verifyPassword(parsed.data.password, customer.passwordHash);
  if (!ok) {
    logCustomerAction({
      actor: customer.email,
      action: "login_failed",
      entity: "Customer",
      entityId: customer.id,
      summary: "wrong password",
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
