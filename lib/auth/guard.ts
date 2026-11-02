// Helper used by every /api/sysuser/* route.
// Returns the authenticated session, or a 401 NextResponse the route can
// `return` directly.

import { NextResponse } from "next/server";
import { getSession, type SysuserSession } from "./session";
import { prisma } from "@/lib/db";
import { ROLE_RANK, roleAtLeast, type AdminRole } from "./roles";

export type { AdminRole };

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

// Role hierarchy lives in ./roles (shared with the MCP token guard). Use this
// on endpoints that should be locked down beyond plain authentication — user
// management is owner-only, content CRUD is editor+, reporting/operations
// entry (CRM, sales, stock, footfall) is staff+, viewer is read-only.

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
  // Least-privilege fallback for rows with an unknown/missing role.
  const role = ((user?.role ?? "staff") as AdminRole) ?? "staff";
  if (!roleAtLeast(role, min)) {
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
