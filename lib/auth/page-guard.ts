// Page-level companion to lib/auth/guard.ts.
//
// The HTTP guard (requireRole) protects /api/sysuser/* and is the layer that
// actually stops data from leaving. It cannot protect a *page*, because a page
// is not a fetch: proxy.ts admits any request that carries the sk_sysuser
// cookie, without ever reading the role, so `/sysuser/users` renders for a
// viewer just as it does for an owner. Until this file existed, the only thing
// keeping a non-owner off the owner-only screens was that admin-shell.tsx
// declines to draw the nav link — which is presentation, not a gate.
//
// Two consequences of having no page gate, both real before this change:
//   1. UX — a viewer who types the address gets the full owner-only UI, which
//      then fails on a wall of 403s from its own fetches. It looks broken.
//   2. Defence in depth — the API guard is the *only* lock. If any handler
//      behind one of those screens is ever relaxed below owner, the screen is
//      immediately reachable with nothing else in the way.
//
// Deliberately mirrors requireRole()'s semantics exactly, including the
// least-privilege `?? "staff"` fallback for rows with a missing/unknown role,
// so a page and its API can never disagree about who you are.

import { getSession } from "./session";
import { prisma } from "@/lib/db";
import { roleAtLeast, type AdminRole } from "./roles";

/**
 * The signed-in admin's role, or null when there is no session at all.
 *
 * Reads cookies(), so any page that calls this renders dynamically. That is
 * correct for /sysuser — the whole admin is per-user by definition — but it is
 * a real change for pages that were previously static client shells.
 */
export async function getPageRole(): Promise<AdminRole | null> {
  const s = await getSession();
  if (!s.userId) return null;
  const user = await prisma.adminUser.findUnique({
    where: { id: s.userId },
    select: { role: true },
  });
  if (!user) return null;
  // Same least-privilege fallback as requireRole() in ./guard.ts.
  return ((user.role ?? "staff") as AdminRole) ?? "staff";
}

/**
 * True when the signed-in admin satisfies `min`. No session, or a session
 * pointing at a deleted AdminUser row, is false.
 */
export async function pageRoleAtLeast(min: AdminRole): Promise<boolean> {
  const role = await getPageRole();
  return role !== null && roleAtLeast(role, min);
}
