export const dynamic = "force-dynamic";

// Session probe used by the auth context on mount.
//
// Returns 200 with user: null when nobody is logged in, rather than 401. Being
// logged out is the normal state for most visitors, and a 401 made the browser
// log a console error and a failed request on EVERY page view for EVERY
// anonymous visitor. The client already treated both cases the same.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { customerGuard } from "@/lib/auth/customer-guard";

export async function GET() {
  const g = await customerGuard();
  if (!g.ok) return NextResponse.json({ message: "ok", user: null });

  const customer = await prisma.customer.findUnique({
    where: { id: g.session.customerId },
    select: { id: true, email: true, name: true, phone: true },
  });
  if (!customer) {
    // Session cookie outlived the account (deleted customer) — to the client
    // that is indistinguishable from being logged out.
    return NextResponse.json({ message: "ok", user: null });
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
