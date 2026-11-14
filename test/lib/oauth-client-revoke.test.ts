// An idle connector has no live access-token row, so the only handle an admin
// has on it is the client. Revoking the client must kill every grant family it
// holds and the registration itself.

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ userId: "u1", email: "owner@local.test" }),
}));
vi.mock("@/lib/audit", () => ({ logAction: () => {} }));
const revokeFamily = vi.fn(async () => ({ refreshTokens: 1, accessTokens: 0 }));
vi.mock("@/lib/oauth/grants", () => ({ revokeFamily }));

const clientUpdate = vi.fn(async () => ({}));
vi.mock("@/lib/db", () => ({
  prisma: {
    adminUser: { findUnique: async () => ({ id: "u1", role: "owner" }) },
    oAuthClient: {
      findUnique: async () => ({ id: "c1", revokedAt: null }),
      update: clientUpdate,
    },
    oAuthRefreshToken: {
      findMany: async () => [{ familyId: "fam-a" }, { familyId: "fam-b" }],
    },
    mcpToken: { updateMany: async () => ({ count: 0 }) },
  },
}));

describe("DELETE /api/sysuser/oauth-clients/[id]", () => {
  it("revokes every grant family and the client registration", async () => {
    const mod = await import("@/app/api/sysuser/oauth-clients/[id]/route");
    const res = await mod.DELETE(
      new Request("http://localhost/api/sysuser/oauth-clients/c1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "c1" }) },
    );
    expect(res.status).toBe(200);
    expect(revokeFamily).toHaveBeenCalledWith("fam-a", expect.any(String));
    expect(revokeFamily).toHaveBeenCalledWith("fam-b", expect.any(String));
    expect(clientUpdate).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
