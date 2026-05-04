// Helper used by every /api/sysuser/* route.
// Returns the authenticated session, or a 401 NextResponse the route can
// `return` directly.

import { NextResponse } from "next/server";
import { getSession, type SysuserSession } from "./session";
import { prisma } from "@/lib/db";

export type AdminRole = "owner" | "editor" | "viewer";

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

// Role hierarchy: owner ⊃ editor ⊃ viewer. Use this on endpoints that should
// be locked down beyond plain authentication — e.g. user management is
// owner-only, while content editors can run on editor or owner.
const ROLE_RANK: Record<AdminRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export async function requireRole(min: AdminRole): Promise<
  | {
      ok: true;
      session: Required<Pick<SysuserSession, "userId" | "email">>;
      role: AdminRole;
    }
  | { ok: false; response: NextResponse }
> {
  const guard = await adminGuard();
  if (!guard.ok) return guard;
  const user = await prisma.adminUser.findUnique({
    where: { id: guard.session.userId },
    select: { role: true },
  });
  const role = ((user?.role ?? "editor") as AdminRole) ?? "editor";
  if (ROLE_RANK[role] < ROLE_RANK[min]) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Forbidden — requires higher role" },
        { status: 403 },
      ),
    };
  }
  return { ok: true, session: guard.session, role };
}
