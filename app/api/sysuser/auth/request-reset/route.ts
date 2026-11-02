export const dynamic = "force-dynamic";

// Step 1 of the password-reset flow. Public endpoint (no session required).
//
// We always return 200 regardless of whether the email matches a real
// account, to avoid leaking which addresses are admins. When the email IS
// known, we mint a 32-byte token, store its bcrypt hash, and (in non-prod)
// echo the token in the response so an owner can manually share the URL.
//
// The link is now also SENT, via lib/email — line for line the same as the
// customer twin in app/api/customer/auth/request-reset/route.ts. Until this
// change the admin route minted a token and then did nothing with it: outside
// development the token existed only in the database, so a locked-out admin
// had no way to ever see it. Note that lib/email degrades to console logging
// when SMTP_HOST is unset, so this only reaches a real inbox once SMTP is
// configured on the host.

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { logAction } from "@/lib/audit";
import { env } from "@/lib/env";
import { sendEmail, passwordResetEmail } from "@/lib/email";

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
    select: { id: true, email: true, name: true },
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

  // Same link shape as the customer flow: /…/reset?uid=<id>&token=<raw>.
  // Prefer the configured site URL so a link minted behind the proxy still
  // points at the public host.
  const origin =
    env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  const resetUrl = `${origin}/sysuser/reset?uid=${user.id}&token=${rawToken}`;

  // Fire-and-forget: sendEmail never throws, so a mail outage cannot turn a
  // reset request into a 500 (and cannot change the opaque response either).
  void sendEmail({
    to: user.email,
    ...passwordResetEmail({ name: user.name ?? user.email, resetUrl }),
  });

  logAction({
    actor: user.email,
    action: "update",
    entity: "PasswordResetToken",
    entityId: user.id,
    summary: "reset requested",
  });

  // In production the token only ever leaves via the email above and is
  // never returned in the HTTP body. In dev the mailer usually has no SMTP
  // host and only console-logs, so echo the token for local use — guarded by
  // NODE_ENV so prod responses stay opaque.
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({
      message:
        "Reset token issued (dev mode — SMTP not configured).",
      devToken: rawToken,
      devUserId: user.id,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000).toISOString(),
    });
  }

  return generic;
}
