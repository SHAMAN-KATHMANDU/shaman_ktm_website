// Iron-session-backed admin sessions.
// Cookie name: sk_sysuser. Lives 14 days, refreshed on each request.

import { cookies } from "next/headers";
import { getIronSession, SessionOptions } from "iron-session";

export interface SysuserSession {
  userId?: string;
  email?: string;
  name?: string;
}

const SESSION_COOKIE = "sk_sysuser";

function options(): SessionOptions {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_PASSWORD must be set to a 32+ character random string",
    );
  }
  return {
    password,
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14, // 14 days
    },
  };
}

export async function getSession(): Promise<SysuserSession> {
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
