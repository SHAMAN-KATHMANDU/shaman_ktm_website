export const dynamic = "force-dynamic";

// Step 1 of the password-reset flow. Public endpoint (no session required).
//
// We always return 200 regardless of whether the email matches a real
// account, to avoid leaking which addresses are admins. When the email IS
// known, we mint a 32-byte token, store its bcrypt hash, and (in non-prod)
// echo the token in the response so an owner can manually share the URL
// until an email sender is wired up.

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { logAction } from "@/lib/audit";

const Body = z.object({
  email: z.string().email(),
});

const TOKEN_TTL_MIN = 30;
const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid email" },
      { status: 400 },
    );
  }
  const email = parsed.data.email.toLowerCase();

  // Same generic shape regardless of result — opaque on purpose.
  const generic = NextResponse.json({
    message:
      "If that email matches an admin account, a reset link has been issued.",
  });

  const user = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) return generic;

  // Rate limit: 3 requests per email per 15 minutes.
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recent = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: since } },
  });
  if (recent >= 3) {
    return NextResponse.json(
      { message: "Too many reset requests — try again later." },
      { status: 429 },
    );
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = await hashPassword(rawToken);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000),
    },
  });

  logAction({
    actor: user.email,
    action: "update",
    entity: "PasswordResetToken",
    entityId: user.id,
    summary: "reset requested",
  });

  // In production this token is sent via email and never returned in the
  // HTTP body. Until an email provider is wired up, surface it for owners
  // to relay manually — guarded by NODE_ENV so prod responses stay opaque.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({
      message:
        "Reset token issued (dev mode — email sender not yet wired up).",
      devToken: rawToken,
      devUserId: user.id,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString(),
    });
  }

  return generic;
}
