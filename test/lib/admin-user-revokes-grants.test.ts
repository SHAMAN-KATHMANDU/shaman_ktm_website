// Deleting or demoting an admin must end the MCP connections that act as them.
// On delete the revoke has to run first: the refresh rows cascade away with the
// user and take the family ids with them.

import { describe, expect, it, vi, beforeEach } from "vitest";

const calls: string[] = [];
const revokeUserGrants = vi.fn(async () => {
  calls.push("revoke");
  return { refreshTokens: 1, accessTokens: 1 };
});
vi.mock("@/lib/oauth/grants", () => ({ revokeUserGrants }));
vi.mock("@/lib/audit", () => ({ logAction: () => {} }));
vi.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ userId: "owner-1", email: "owner@local.test" }),
  setSession: async () => {},
}));

let targetRole = "owner";
vi.mock("@/lib/db", () => ({
  prisma: {
    adminUser: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === "owner-1"
          ? { id: "owner-1", role: "owner", sessionVersion: 0 }
          : { id: where.id, role: targetRole, email: "t@local.test" },
      count: async () => 2,
      update: async () => ({ id: "u2", role: "viewer", sessionVersion: 1 }),
      delete: async () => {
        calls.push("delete");
        return {};
      },
    },
  },
}));

const route = await import("@/app/api/sysuser/users/[id]/route");
const ctx = { params: Promise.resolve({ id: "u2" }) };

describe("admin user changes end their MCP grants", () => {
  beforeEach(() => {
    calls.length = 0;
    revokeUserGrants.mockClear();
    targetRole = "owner";
  });

  it("revokes before deleting", async () => {
    const res = await route.DELETE(new Request("http://x", { method: "DELETE" }), ctx);
    expect(res.status).toBe(200);
    expect(calls).toEqual(["revoke", "delete"]);
  });

  it("revokes on demotion", async () => {
    const res = await route.PATCH(
      new Request("http://x", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "viewer" }),
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    expect(revokeUserGrants).toHaveBeenCalledWith("u2", expect.any(String));
  });

  it("leaves grants alone on a promotion", async () => {
    targetRole = "viewer";
    await route.PATCH(
      new Request("http://x", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "editor" }),
      }),
      ctx,
    );
    expect(revokeUserGrants).not.toHaveBeenCalled();
  });
});
