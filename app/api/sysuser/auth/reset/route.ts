export const dynamic = "force-dynamic";

// Step 2 of the password-reset flow. Consumes a reset token issued by
// /request-reset and sets a new password. Public endpoint.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { logAction } from "@/lib/audit";

const Body = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/\d/, "Must include a digit")
    .regex(/[^A-Za-z0-9]/, "Must include a symbol"),
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

  // Token storage uses bcrypt-hash, so we have to scan the user's
  // recent unconsumed tokens and verify each — typical fan-out is tiny.
  const candidates = await prisma.passwordResetToken.findMany({
    where: {
      userId,
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
    prisma.adminUser.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.update({
      where: { id: matched.id },
      data: { consumedAt: new Date() },
    }),
    // Invalidate any other live tokens for the same user — defence in depth.
    prisma.passwordResetToken.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    }),
  ]);

  logAction({
    actor: userId,
    action: "change_password",
    entity: "AdminUser",
    entityId: userId,
    summary: "via reset token",
  });

  return NextResponse.json({ message: "ok" });
}
