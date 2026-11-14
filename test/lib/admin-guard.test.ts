// A session cookie lives 14 days and is stateless, so the guard has to consult
// the AdminUser row: a deleted admin used to fall back to "staff" and keep
// working until the cookie expired.

import { describe, expect, it, vi, beforeEach } from "vitest";

const destroy = vi.fn();
let session: Record<string, unknown> = {};
let userRow: Record<string, unknown> | null = null;

vi.mock("@/lib/auth/session", () => ({
  getSession: async () => session,
}));
vi.mock("@/lib/db", () => ({
  prisma: { adminUser: { findUnique: async () => userRow } },
}));

import { adminGuard, requireRole } from "@/lib/auth/guard";

describe("admin guard", () => {
  beforeEach(() => {
    destroy.mockClear();
    session = { userId: "u1", email: "gone@local.test", destroy };
  });

  it("rejects and ends the session when the admin row is gone", async () => {
    userRow = null;
    const g = await requireRole("viewer");
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.response.status).toBe(401);
    expect(destroy).toHaveBeenCalled();
    expect((await adminGuard()).ok).toBe(false);
  });

  it("ends a session issued before the admin's sessionVersion was bumped", async () => {
    userRow = { role: "owner", sessionVersion: 1 };
    session = { ...session, sv: 0 };
    const g = await requireRole("viewer");
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.response.status).toBe(401);
    // Refused but not destroyed: the browser may already hold the new cookie.
    expect(destroy).not.toHaveBeenCalled();
  });

  it("treats a cookie from before sessionVersion existed as version 0", async () => {
    userRow = { role: "owner", sessionVersion: 0 };
    expect((await requireRole("owner")).ok).toBe(true);
  });

  it("admits a live admin with their stored role", async () => {
    userRow = { role: "editor" };
    const g = await requireRole("editor");
    expect(g.ok && g.role).toBe("editor");
    expect(destroy).not.toHaveBeenCalled();
  });
});
