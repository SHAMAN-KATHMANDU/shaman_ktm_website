// Iron-session-backed customer sessions — the storefront twin of session.ts
// (which handles /sysuser admins). Separate cookie so admin and customer
// logins coexist in one browser. Lives 30 days.

import { cookies } from "next/headers";
import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { env } from "@/lib/env";

export interface CustomerSessionData {
  customerId?: string;
  email?: string;
  name?: string;
}

type Session = IronSession<CustomerSessionData>;

export const CUSTOMER_SESSION_COOKIE = "sk_customer";

function options(): SessionOptions {
  return {
    password: env.SESSION_PASSWORD,
    cookieName: CUSTOMER_SESSION_COOKIE,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV !== "development",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    },
  };
}

export async function getCustomerSession(): Promise<Session> {
  const store = await cookies();
  return getIronSession<CustomerSessionData>(store, options());
}

export async function setCustomerSession(
  customer: { id: string; email: string; name?: string | null },
): Promise<void> {
  const s = await getCustomerSession();
  s.customerId = customer.id;
  s.email = customer.email;
  s.name = customer.name ?? undefined;
  await s.save();
}

export async function clearCustomerSession(): Promise<void> {
  const s = await getCustomerSession();
  s.destroy();
}
