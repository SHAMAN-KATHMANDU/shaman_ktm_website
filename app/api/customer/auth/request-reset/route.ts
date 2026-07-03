export const dynamic = "force-dynamic";

// Step 1 of the customer password-reset flow — mirrors the admin
// /api/sysuser/auth/request-reset (opaque 200, per-email rate limit) but
// delivers the link by email via lib/email. Without SMTP configured the
// mailer only console-logs, so non-prod responses also echo the token for
// manual testing (same escape hatch the admin flow uses).

import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { logCustomerAction } from "@/lib/audit";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { env } from "@/lib/env";

const Body = z.object({
  email: z.string().email(),
});

const TOKEN_TTL_MIN = 30;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_REQUESTS = 3;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid email" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  // Same generic shape regardless of result — opaque on purpose.
  const generic = NextResponse.json({
    message:
      "If that email matches an account, a reset link has been sent to it.",
  });

  const customer = await prisma.customer.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });
  if (!customer) return generic;

  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recent = await prisma.customerPasswordResetToken.count({
    where: { customerId: customer.id, createdAt: { gte: since } },
  });
  if (recent >= RATE_MAX_REQUESTS) {
    return NextResponse.json(
      { message: "Too many reset requests — try again later." },
      { status: 429, headers: { "Retry-After": "900" } },
    );
  }

  const rawToken = randomBytes(32).toString("base64url");
  await prisma.customerPasswordResetToken.create({
    data: {
      customerId: customer.id,
      tokenHash: await hashPassword(rawToken),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000),
    },
  });

  const origin =
    env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(req.url).origin;
  const resetUrl = `${origin}/account/reset?uid=${customer.id}&token=${rawToken}`;

  void sendEmail({
    to: customer.email,
    ...passwordResetEmail({ name: customer.name, resetUrl }),
  });

  logCustomerAction({
    actor: customer.email,
    action: "request_reset",
    entity: "Customer",
    entityId: customer.id,
  });

  if (process.env.NODE_ENV !== "production" && !env.SMTP_HOST) {
    return NextResponse.json({
      message: "Reset token issued (dev mode — SMTP not configured).",
      devToken: rawToken,
      devUserId: customer.id,
      devResetUrl: resetUrl,
    });
  }

  return generic;
}
