// Helper used by every authenticated /api/customer/* route — the storefront
// twin of guard.ts. Returns the session, or a 401 NextResponse the route can
// `return` directly.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getCustomerSession,
  type CustomerSessionData,
} from "./customer-session";

export async function customerGuard(): Promise<
  | {
      ok: true;
      session: Required<Pick<CustomerSessionData, "customerId" | "email">>;
    }
  | { ok: false; response: NextResponse }
> {
  const unauthorized = {
    ok: false as const,
    response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
  };
  const s = await getCustomerSession();
  if (!s.customerId || !s.email) return unauthorized;
  // Stateless cookie: a password change/reset bumps sessionVersion, which is
  // the only way to end the customer's other sessions before expiry.
  const customer = await prisma.customer.findUnique({
    where: { id: s.customerId },
    select: { sessionVersion: true },
  });
  if (!customer || (customer.sessionVersion ?? 0) !== (s.sv ?? 0)) {
    s.destroy();
    return unauthorized;
  }
  return { ok: true, session: { customerId: s.customerId, email: s.email } };
}
