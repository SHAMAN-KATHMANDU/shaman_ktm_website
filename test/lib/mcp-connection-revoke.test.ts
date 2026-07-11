// Revoking an OAuth connection from the admin must kill the whole grant, not
// just the current access token. Access tokens live an hour; if the refresh
// chain survives, the connector silently mints a new one and stays connected —
// so a revoke that only touches the McpToken row is no revoke at all.

import { describe, expect, it, vi, beforeEach } from "vitest";

let currentRole: "owner" | "editor" | "viewer" = "owner";

vi.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ userId: "u1", email: "owner@local.test" }),
}));

const revokeFamily = vi.fn(async () => {});
vi.mock("@/lib/oauth/grants", () => ({ revokeFamily }));
vi.mock("@/lib/audit", () => ({ logAction: () => {} }));

// The token row the route will find; tests swap oauthFamilyId to switch between
// an OAuth-issued connection and a legacy hand-created token.
let tokenRow: Record<string, unknown> = {};
const mcpTokenUpdate = vi.fn(async () => tokenRow);

vi.mock("@/lib/db", () => ({
  prisma: {
    adminUser: { findUnique: async () => ({ id: "u1", role: currentRole }) },
    mcpToken: {
      findUnique: async () => tokenRow,
      update: mcpTokenUpdate,
    },
  },
}));

const patch = async (id = "t1") => {
  const mod = await import("@/app/api/sysuser/mcp-tokens/[id]/route");
  const res = await mod.PATCH(
    new Request("http://localhost/api/sysuser/mcp-tokens/t1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoke: true }),
    }),
    { params: Promise.resolve({ id }) },
  );
  return res.status;
};

describe("revoking an MCP connection", () => {
  beforeEach(() => {
    currentRole = "owner";
    revokeFamily.mockClear();
    mcpTokenUpdate.mockClear();
  });

  it("kills the whole grant family for an OAuth-issued token", async () => {
    tokenRow = {
      id: "t1",
      name: "oauth:Claude",
      oauthFamilyId: "fam-1",
      revokedAt: null,
    };
    expect(await patch()).toBe(200);
    // The family kill is what actually disconnects the client.
    expect(revokeFamily).toHaveBeenCalledWith("fam-1", expect.any(String));
    // ...and we must not "revoke" only the single access-token row.
    expect(mcpTokenUpdate).not.toHaveBeenCalled();
  });

  it("revokes the row directly for a legacy hand-created token", async () => {
    tokenRow = {
      id: "t1",
      name: "claude-desktop",
      oauthFamilyId: null,
      revokedAt: null,
    };
    expect(await patch()).toBe(200);
    expect(revokeFamily).not.toHaveBeenCalled();
    expect(mcpTokenUpdate).toHaveBeenCalled();
  });

  it("is owner-only", async () => {
    currentRole = "editor";
    tokenRow = { id: "t1", name: "x", oauthFamilyId: "fam-1", revokedAt: null };
    expect(await patch()).toBe(403);
    expect(revokeFamily).not.toHaveBeenCalled();
  });
});
