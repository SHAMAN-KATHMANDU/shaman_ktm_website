// An MCP token or OAuth grant acts as the admin who approved it, so it must
// never carry more authority than that admin has TODAY: refresh used to
// re-issue the stored grantRole for ever, and verifyMcpToken never looked at
// the creator at all.

import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/audit", () => ({ logAction: () => {} }));

let tokenRow: Record<string, unknown> | null = null;
let refreshRow: Record<string, unknown> = {};
let admin: Record<string, unknown> | null = null;
const mcpTokenCreate = vi.fn(async () => ({}));
const refreshCreate = vi.fn(async () => ({}));

vi.mock("@/lib/db", () => ({
  prisma: {
    mcpToken: {
      findUnique: async () => tokenRow,
      update: async () => ({}),
      create: mcpTokenCreate,
      deleteMany: async () => ({ count: 0 }),
      updateMany: async () => ({ count: 0 }),
    },
    oAuthRefreshToken: {
      findUnique: async () => refreshRow,
      updateMany: async () => ({ count: 1 }),
      create: refreshCreate,
    },
    adminUser: { findUnique: async () => admin },
    $transaction: async (ops: unknown) =>
      Array.isArray(ops) ? Promise.all(ops as Promise<unknown>[]) : undefined,
  },
}));

const { verifyMcpToken } = await import("@/lib/mcp/auth");
const { exchangeRefreshToken } = await import("@/lib/oauth/grants");

const client = {
  id: "client-row-1",
  clientId: "smk_oc_test",
  clientName: "Claude",
  grantTypes: ["authorization_code", "refresh_token"],
} as never;

describe("verifyMcpToken", () => {
  beforeEach(() => {
    tokenRow = {
      id: "t1",
      name: "oauth:Claude",
      role: "owner",
      createdByUserId: "u1",
      revokedAt: null,
      expiresAt: null,
    };
  });

  it("caps the token at its creator's current role", async () => {
    admin = { role: "viewer" };
    expect((await verifyMcpToken("smk_mcp_x"))?.role).toBe("viewer");
  });

  it("rejects the token once its creator is deleted", async () => {
    admin = null;
    expect(await verifyMcpToken("smk_mcp_x")).toBeNull();
  });

  it("keeps a legacy token with no creator id at its stored role", async () => {
    tokenRow = { ...tokenRow, createdByUserId: null, role: "editor" };
    admin = null;
    expect((await verifyMcpToken("smk_mcp_x"))?.role).toBe("editor");
  });
});

describe("exchangeRefreshToken", () => {
  it("re-issues at the approver's current role, not the stored grant role", async () => {
    refreshRow = {
      id: "rt-1",
      clientId: "client-row-1",
      familyId: "fam-1",
      rotatedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      userId: "u1",
      grantRole: "owner",
      scope: "mcp",
    };
    admin = { id: "u1", email: "demoted@local.test", role: "editor" };
    await exchangeRefreshToken({ client, refreshToken: "smk_rt_x" });
    expect(mcpTokenCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: "editor", createdByUserId: "u1" }),
    });
    expect(refreshCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ grantRole: "editor" }),
    });
  });
});
