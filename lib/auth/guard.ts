// Helper used by every /api/sysuser/* route.
// Returns the authenticated session, or a 401 NextResponse the route can
// `return` directly.

import { NextResponse } from "next/server";
import { getSession, type SysuserSession } from "./session";
import { prisma } from "@/lib/db";
import { roleAtLeast, type AdminRole } from "./roles";

export type { AdminRole };

const unauthorized = () =>
  NextResponse.json({ message: "Unauthorized" }, { status: 401 });

export async function adminGuard(): Promise<
  | {
      ok: true;
      session: Required<Pick<SysuserSession, "userId" | "email">>;
      role: AdminRole;
    }
  | { ok: false; response: NextResponse }
> {
  const s = await getSession();
  if (!s.userId || !s.email) {
    return { ok: false, response: unauthorized() };
  }
  // The cookie is stateless and lives 14 days, so the row is the only thing
  // that can end it early: a deleted admin must lose access now, not at expiry.
  const user = await prisma.adminUser.findUnique({
    where: { id: s.userId },
    select: { role: true, sessionVersion: true },
  });
  // A bumped version (password change/reset, role change) ends older cookies.
  if (!user) {
    s.destroy();
    return { ok: false, response: unauthorized() };
  }
  // No destroy() on a stale version: a request still in flight with the old
  // cookie would otherwise delete the new one the password change just set.
  if ((user.sessionVersion ?? 0) !== (s.sv ?? 0)) {
    return { ok: false, response: unauthorized() };
  }
  // Least-privilege fallback for rows with an unknown/missing role.
  const role = (user.role ?? "staff") as AdminRole;
  return { ok: true, session: { userId: s.userId, email: s.email }, role };
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
  if (!roleAtLeast(guard.role, min)) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Forbidden — requires higher role" },
        { status: 403 },
      ),
    };
  }
  return guard;
}
