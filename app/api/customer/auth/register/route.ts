export const dynamic = "force-dynamic";

// Customer registration. Creates the account and logs the customer straight
// in (sets the sk_customer iron-session cookie) so checkout continues
// uninterrupted.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  clearCustomerSession,
  setCustomerSession,
} from "@/lib/auth/customer-session";
import { logCustomerAction } from "@/lib/audit";

const Body = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(32).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid input", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { message: "This email is already registered — log in instead." },
      { status: 409 },
    );
  }

  const customer = await prisma.customer.create({
    data: {
      email,
      passwordHash: await hashPassword(parsed.data.password),
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      lastLoginAt: new Date(),
    },
  });

  await clearCustomerSession();
  await setCustomerSession(customer);
  logCustomerAction({
    actor: customer.email,
    action: "register",
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
