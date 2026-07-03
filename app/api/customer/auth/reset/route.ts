export const dynamic = "force-dynamic";

// Step 2 of the customer password-reset flow — consumes a token issued by
// /request-reset. Mirrors the admin reset route, with the customer password
// policy (8+ chars) instead of the stricter admin one.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { logCustomerAction } from "@/lib/audit";

const Body = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { userId, token, newPassword } = parsed.data;

  // Token storage uses bcrypt-hash, so scan the customer's recent unconsumed
  // tokens and verify each — typical fan-out is tiny.
  const candidates = await prisma.customerPasswordResetToken.findMany({
    where: {
      customerId: userId,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  let matched: (typeof candidates)[number] | null = null;
  for (const t of candidates) {
    if (await verifyPassword(token, t.tokenHash)) {
      matched = t;
      break;
    }
  }

  if (!matched) {
    return NextResponse.json(
      { message: "Reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.customer.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.customerPasswordResetToken.update({
      where: { id: matched.id },
      data: { consumedAt: new Date() },
    }),
    // Invalidate any other live tokens for the same customer.
    prisma.customerPasswordResetToken.updateMany({
      where: { customerId: userId, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
  ]);

  logCustomerAction({
    actor: userId,
    action: "reset_password",
    entity: "Customer",
    entityId: userId,
    summary: "via reset token",
  });

  return NextResponse.json({ message: "ok" });
}
