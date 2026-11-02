// An audit entry must record a state change, not an attempt.
//
// exchangeRefreshToken() kills the whole token family when a rotated or
// revoked refresh token is presented again — correct, and unchanged here. What
// was wrong is that it wrote a fresh "family revoked" audit row on EVERY such
// presentation, including presentations against a family that died weeks ago
// and had nothing left to revoke.
//
// That is not a theoretical tidiness point. In production on 2026-08-21 one
// connector ("Hermes Agent", client smk_oc_uDCMhN76tlTrnOqzb_QQoA) had been
// replaying a single refresh token revoked on 2026-07-14, twice every fifteen
// minutes, unbroken. It had produced 10,166 of the 13,371 rows in the AdminLog
// table — 76% of the entire admin audit trail — every one of them claiming a
// revocation that did not happen. A real reuse event would have been
// invisible in that.
//
// The rejection is deliberately NOT changed: a stale token is still refused
// with invalid_grant, and the console still warns on every attempt, so the
// operational signal survives. Only the false claim of a state change stops.

import { describe, expect, it, vi, beforeEach } from "vitest";

const logAction = vi.fn();
vi.mock("@/lib/audit", () => ({ logAction }));
vi.mock("@/lib/mcp/auth", () => ({
  generateMcpToken: () => ({ token: "tok", tokenHash: "hash", prefix: "pre" }),
}));

// How many rows the next revokeFamily() call will find still alive.
let liveRefreshTokens = 0;
let liveAccessTokens = 0;

// The row exchangeRefreshToken() will find for the presented token.
let row: Record<string, unknown> = {};

vi.mock("@/lib/db", () => ({
  prisma: {
    oAuthRefreshToken: {
      findUnique: async () => row,
      updateMany: async () => ({ count: liveRefreshTokens }),
    },
    mcpToken: {
      updateMany: async () => ({ count: liveAccessTokens }),
    },
    adminUser: { findUnique: async () => ({ id: "u1", email: "owner@local.test" }) },
    $transaction: async (ops: unknown) =>
      Array.isArray(ops) ? Promise.all(ops as Promise<unknown>[]) : undefined,
  },
}));

const { exchangeRefreshToken, revokeFamily } = await import("@/lib/oauth/grants");

const client = {
  id: "client-row-1",
  clientId: "smk_oc_test",
  clientName: "Hermes Agent",
} as never;

/** Present a token whose family is already dead (rotated + revoked). */
async function replayStaleToken() {
  return exchangeRefreshToken({ client, refreshToken: "whatever" }).then(
    () => "resolved",
    (e: Error & { code?: string }) => e.code ?? e.message,
  );
}

// Created once: vi.spyOn() on an already-spied method hands back the SAME
// mock, so re-spying per test would silently accumulate calls across tests.
const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

beforeEach(() => {
  logAction.mockClear();
  warn.mockClear();
  row = {
    id: "rt-1",
    clientId: "client-row-1",
    familyId: "fam-dead",
    tokenHash: "h",
    rotatedAt: new Date("2026-07-14T05:45:02Z"),
    revokedAt: new Date("2026-07-14T05:45:02Z"),
    expiresAt: new Date("2027-01-01T00:00:00Z"),
    userId: "u1",
    grantRole: "editor",
    scope: "mcp",
  };
});

describe("refresh-token reuse detection", () => {
  it("logs the revocation when live tokens are actually killed", async () => {
    liveRefreshTokens = 2;
    liveAccessTokens = 1;
    expect(await replayStaleToken()).toBe("invalid_grant");

    expect(logAction).toHaveBeenCalledTimes(1);
    const summary = String(logAction.mock.calls[0][0].summary);
    expect(summary).toContain("reuse detected");
    // The entry says how much died, so it is evidence rather than an assertion.
    expect(summary).toContain("2 refresh token(s)");
    expect(summary).toContain("1 access token(s)");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain("reuse detected");
  });

  it("writes NO audit entry when the family was already dead", async () => {
    liveRefreshTokens = 0;
    liveAccessTokens = 0;
    expect(await replayStaleToken()).toBe("invalid_grant");

    expect(logAction).not.toHaveBeenCalled();
    // ...but the operational signal is not suppressed: it is relabelled.
    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0][0]);
    expect(line).toContain("already-revoked family");
    expect(line).toContain("nothing left to revoke");
  });

  it("does not let one broken client manufacture an audit trail", async () => {
    // The exact production shape: one live kill, then an unbounded replay loop
    // against the corpse. 1 real event, 40 attempts.
    liveRefreshTokens = 1;
    liveAccessTokens = 1;
    await replayStaleToken();
    liveRefreshTokens = 0;
    liveAccessTokens = 0;
    for (let i = 0; i < 40; i++) await replayStaleToken();

    expect(logAction).toHaveBeenCalledTimes(1);
    // Every single attempt is still visible to an operator reading the logs.
    expect(warn).toHaveBeenCalledTimes(41);
  });

  it("still rejects the stale token identically", async () => {
    liveRefreshTokens = 0;
    liveAccessTokens = 0;
    await expect(
      exchangeRefreshToken({ client, refreshToken: "whatever" }),
    ).rejects.toThrow("refresh token is no longer valid");
  });
});

describe("revokeFamily", () => {
  beforeEach(() => {
    logAction.mockClear();
    warn.mockClear();
  });

  // Guards the other direction: the fix must not have silenced legitimate
  // revocations (admin revoking a connection, RFC 7009 revocation, a grant
  // whose approving admin was deleted).
  it("still logs a deliberate revocation that kills something", async () => {
    liveRefreshTokens = 1;
    liveAccessTokens = 3;
    const killed = await revokeFamily("fam-live", "connection revoked from the admin");
    expect(killed).toEqual({ refreshTokens: 1, accessTokens: 3 });
    expect(logAction).toHaveBeenCalledTimes(1);
    expect(String(logAction.mock.calls[0][0].summary)).toContain(
      "connection revoked from the admin",
    );
  });

  it("reports what it killed even when that is nothing", async () => {
    liveRefreshTokens = 0;
    liveAccessTokens = 0;
    expect(await revokeFamily("fam-dead", "whatever")).toEqual({
      refreshTokens: 0,
      accessTokens: 0,
    });
    expect(logAction).not.toHaveBeenCalled();
  });
});
