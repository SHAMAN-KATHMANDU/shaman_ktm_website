export const dynamic = "force-dynamic";

// Session probe used by the auth context on mount. 401 when logged out.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customerGuard } from "@/lib/auth/customer-guard";

export async function GET() {
  const g = await customerGuard();
  if (!g.ok) return g.response;

  const customer = await prisma.customer.findUnique({
    where: { id: g.session.customerId },
    select: { id: true, email: true, name: true, phone: true },
  });
  if (!customer) {
    // Session cookie outlived the account (deleted customer).
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

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
