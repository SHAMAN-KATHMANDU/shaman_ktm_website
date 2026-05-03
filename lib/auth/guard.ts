// Helper used by every /api/sysuser/* route.
// Returns the authenticated session, or a 401 NextResponse the route can
// `return` directly.

import { NextResponse } from "next/server";
import { getSession, type SysuserSession } from "./session";

export async function adminGuard(): Promise<
  | { ok: true; session: Required<Pick<SysuserSession, "userId" | "email">> }
  | { ok: false; response: NextResponse }
> {
  const s = await getSession();
  if (!s.userId || !s.email) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 },
      ),
    };
  }
  return { ok: true, session: { userId: s.userId, email: s.email } };
}
