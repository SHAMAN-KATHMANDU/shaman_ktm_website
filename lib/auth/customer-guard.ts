// Helper used by every authenticated /api/customer/* route — the storefront
// twin of guard.ts. Returns the session, or a 401 NextResponse the route can
// `return` directly.

import { NextResponse } from "next/server";
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
  const s = await getCustomerSession();
  if (!s.customerId || !s.email) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      ),
    };
  }
  return { ok: true, session: { customerId: s.customerId, email: s.email } };
}
