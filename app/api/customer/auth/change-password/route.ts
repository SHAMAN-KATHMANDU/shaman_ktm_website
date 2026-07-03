export const dynamic = "force-dynamic";

// Authenticated password change (dashboard) — requires the current password.

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { customerGuard } from "@/lib/auth/customer-guard";
import { logCustomerAction } from "@/lib/audit";

const Body = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
});

export async function POST(req: Request) {
  const g = await customerGuard();
  if (!g.ok) return g.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Invalid request", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { id: g.session.customerId },
  });
  if (!customer) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const ok = await verifyPassword(
    parsed.data.currentPassword,
    customer.passwordHash,
  );
  if (!ok) {
    return NextResponse.json(
      { message: "Current password is incorrect" },
      { status: 400 },
    );
  }

  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  logCustomerAction({
    actor: customer.email,
    action: "change_password",
    entity: "Customer",
    entityId: customer.id,
  });

  return NextResponse.json({ message: "ok" });
}
