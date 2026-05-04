// Iron-session-backed admin sessions.
// Cookie name: sk_sysuser. Lives 14 days, refreshed on each request.

import { cookies } from "next/headers";
import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { env } from "@/lib/env";

export interface SysuserSession {
  userId?: string;
  email?: string;
  name?: string;
}

type Session = IronSession<SysuserSession>;

export const SESSION_COOKIE = "sk_sysuser";

function options(): SessionOptions {
  return {
    password: env.SESSION_PASSWORD,
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV !== "development",
      path: "/",
      maxAge: 60 * 60 * 24 * 14, // 14 days
    },
  };
}

export async function getSession(): Promise<Session> {
  const store = await cookies();
  return getIronSession<SysuserSession>(store, options());
}

export async function requireAdmin(): Promise<{
  userId: string;
  email: string;
}> {
  const s = await getSession();
  if (!s.userId || !s.email) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return { userId: s.userId, email: s.email };
}

export async function setSession(
  user: { id: string; email: string; name?: string | null },
): Promise<void> {
  const s = await getSession();
  s.userId = user.id;
  s.email = user.email;
  s.name = user.name ?? undefined;
  await s.save();
}

export async function clearSession(): Promise<void> {
  const s = await getSession();
  s.destroy();
}
