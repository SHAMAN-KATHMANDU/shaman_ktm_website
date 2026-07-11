// Grant lifecycle: pending /authorize request → consent decision → single-use
// code → token exchange → refresh rotation with family reuse detection.
//
// Trust model (single-tenant port of the projectX pattern): OAuth clients are
// anonymous registrations with no authority. Authority enters when an owner
// admin approves consent — the grant is stamped with that admin's identity
// plus a chosen role, and every access token minted from it is an ordinary
// McpToken row carrying that role.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { OAuthClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateMcpToken } from "@/lib/mcp/auth";
import { logAction } from "@/lib/audit";
import type { AdminRole } from "@/lib/auth/guard";
import {
  ACCESS_TOKEN_TTL_MS,
  AUTH_REQUEST_TTL_MS,
  CODE_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  mcpResourceUrl,
  sameResource,
} from "./constants";
import { sha256hex } from "./clients";
import type { OAuthErrorCode } from "./http";

export class OAuthGrantError extends Error {
  constructor(
    public code: OAuthErrorCode,
    message: string,
  ) {
    super(message);
  }
}

// ─── PKCE (S256 only — OAuth 2.1 drops "plain") ──────────────────────────────

const CODE_VERIFIER_RE = /^[A-Za-z0-9\-._~]{43,128}$/;

export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!CODE_VERIFIER_RE.test(verifier)) return false;
  const computed = Buffer.from(
    createHash("sha256").update(verifier).digest("base64url"),
  );
  const expected = Buffer.from(challenge);
  return (
    computed.length === expected.length && timingSafeEqual(computed, expected)
  );
}

// ─── /authorize: pending request ─────────────────────────────────────────────

export async function createAuthorizationRequest(args: {
  client: OAuthClient;
  redirectUri: string;
  state?: string;
  scope: string;
  resource?: string;
  codeChallenge: string;
}) {
  // Opportunistic cleanup — anything expired over an hour ago is dead weight.
  await prisma.oAuthAuthorizationRequest.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
  });

  return prisma.oAuthAuthorizationRequest.create({
    data: {
      clientId: args.client.id,
      redirectUri: args.redirectUri,
      state: args.state ?? null,
      scope: args.scope,
      resource: args.resource ?? null,
      codeChallenge: args.codeChallenge,
      expiresAt: new Date(Date.now() + AUTH_REQUEST_TTL_MS),
    },
  });
}

// ─── Consent ─────────────────────────────────────────────────────────────────

export async function getConsentRequest(requestId: string) {
  const row = await prisma.oAuthAuthorizationRequest.findUnique({
    where: { id: requestId },
    include: { client: true },
  });
  if (!row) return null;
  if (row.approvedAt || row.codeUsedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}

function redirectWith(
  redirectUri: string,
  params: Record<string, string | null | undefined>,
): string {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * Stamp the approving admin + granted role onto the request and mint the
 * single-use code. Returns the redirect the browser should follow, or null
 * if the request is gone/expired/already decided.
 */
export async function approveConsent(args: {
  requestId: string;
  role: AdminRole;
  adminEmail: string;
  adminUserId: string;
}): Promise<{ redirectTo: string; clientName: string | null } | null> {
  // Like every other credential here, only the sha256 of the code is stored —
  // a DB read can't be replayed against /token.
  const code = randomBytes(32).toString("base64url");
  const updated = await prisma.oAuthAuthorizationRequest.updateMany({
    where: {
      id: args.requestId,
      approvedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      codeHash: sha256hex(code),
      approvedAt: new Date(),
      approvedBy: args.adminEmail,
      approvedByUserId: args.adminUserId,
      grantRole: args.role,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  if (updated.count === 0) return null;

  const row = await prisma.oAuthAuthorizationRequest.findUnique({
    where: { id: args.requestId },
    include: { client: { select: { clientName: true } } },
  });
  if (!row) return null;
  return {
    redirectTo: redirectWith(row.redirectUri, { code, state: row.state }),
    clientName: row.client.clientName,
  };
}

export async function denyConsent(
  requestId: string,
): Promise<{ redirectTo: string } | null> {
  const row = await prisma.oAuthAuthorizationRequest.findUnique({
    where: { id: requestId },
  });
  if (!row || row.approvedAt || row.expiresAt.getTime() < Date.now()) {
    return null;
  }
  // Burn the request so the code path can never be completed.
  await prisma.oAuthAuthorizationRequest.update({
    where: { id: requestId },
    data: { expiresAt: new Date() },
  });
  return {
    redirectTo: redirectWith(row.redirectUri, {
      error: "access_denied",
      error_description: "The user denied the authorization request",
      state: row.state,
    }),
  };
}

// ─── Token issuance ──────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

// The access token IS a McpToken row: same smk_mcp_ format, sha256 at rest,
// so verifyMcpToken(), per-tool roles, the token-list UI, and revocation all
// apply unchanged. oauthFamilyId ties it to its refresh-token family so a
// family kill (reuse detection, /revoke) sweeps access tokens too.
async function issueTokens(args: {
  client: OAuthClient;
  userId: string;
  adminEmail: string;
  grantRole: string;
  scope: string;
  familyId?: string;
}): Promise<TokenResponse> {
  const { token, tokenHash } = generateMcpToken();
  const familyId = args.familyId ?? randomBytes(16).toString("hex");

  // An hourly-refreshing connector would otherwise pile up a token row per
  // hour in the /sysuser/mcp-tokens list. Sweep only naturally-expired rows —
  // revoked ones are kept for the audit trail, as the schema promises.
  await prisma.mcpToken.deleteMany({
    where: {
      oauthClientId: { not: null },
      revokedAt: null,
      expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  await prisma.mcpToken.create({
    data: {
      name: `oauth:${args.client.clientName ?? args.client.clientId}`,
      tokenHash,
      role: args.grantRole,
      createdBy: args.adminEmail,
      expiresAt: new Date(Date.now() + ACCESS_TOKEN_TTL_MS),
      oauthClientId: args.client.id,
      oauthFamilyId: familyId,
    },
  });

  const response: TokenResponse = {
    access_token: token,
    token_type: "bearer",
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    scope: args.scope,
  };

  if (args.client.grantTypes.includes("refresh_token")) {
    const refreshToken = `smk_rt_${randomBytes(32).toString("base64url")}`;
    await prisma.oAuthRefreshToken.create({
      data: {
        tokenHash: sha256hex(refreshToken),
        familyId,
        clientId: args.client.id,
        userId: args.userId,
        grantRole: args.grantRole,
        scope: args.scope,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
    response.refresh_token = refreshToken;
  }

  return response;
}

export async function exchangeAuthorizationCode(args: {
  client: OAuthClient;
  code: string;
  codeVerifier: string;
  redirectUri?: string;
  resource?: string;
  origin: string;
}): Promise<TokenResponse> {
  const request = await prisma.oAuthAuthorizationRequest.findUnique({
    where: { codeHash: sha256hex(args.code) },
  });
  if (!request || request.clientId !== args.client.id) {
    throw new OAuthGrantError("invalid_grant", "unknown authorization code");
  }
  if (!request.approvedAt || !request.approvedByUserId || !request.grantRole) {
    throw new OAuthGrantError(
      "invalid_grant",
      "authorization request was never approved",
    );
  }
  if (request.expiresAt.getTime() < Date.now()) {
    throw new OAuthGrantError("invalid_grant", "authorization code expired");
  }
  if (args.redirectUri && args.redirectUri !== request.redirectUri) {
    throw new OAuthGrantError(
      "invalid_grant",
      "redirect_uri does not match the authorization request",
    );
  }
  if (args.resource) {
    const expected = request.resource ?? mcpResourceUrl(args.origin);
    if (!sameResource(args.resource, expected)) {
      throw new OAuthGrantError(
        "invalid_target",
        "resource does not match the authorization request",
      );
    }
  }
  if (!verifyPkceS256(args.codeVerifier, request.codeChallenge)) {
    throw new OAuthGrantError("invalid_grant", "PKCE verification failed");
  }

  // Single-use: exactly one exchange wins, even under a concurrent replay.
  const claimed = await prisma.oAuthAuthorizationRequest.updateMany({
    where: { id: request.id, codeUsedAt: null },
    data: { codeUsedAt: new Date() },
  });
  if (claimed.count === 0) {
    throw new OAuthGrantError(
      "invalid_grant",
      "authorization code already used",
    );
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: request.approvedByUserId },
    select: { id: true, email: true },
  });
  if (!admin) {
    throw new OAuthGrantError(
      "invalid_grant",
      "the approving admin account no longer exists",
    );
  }

  const tokens = await issueTokens({
    client: args.client,
    userId: admin.id,
    adminEmail: admin.email,
    grantRole: request.grantRole,
    scope: request.scope,
  });
  logAction({
    actor: `oauth:${args.client.clientName ?? args.client.clientId}`,
    action: "create",
    entity: "OAuthGrant",
    entityId: request.id,
    summary: `grant activated — acts as ${admin.email} (${request.grantRole})`,
  });
  return tokens;
}

async function revokeFamily(familyId: string, reason: string): Promise<void> {
  await prisma.$transaction([
    prisma.oAuthRefreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
    prisma.mcpToken.updateMany({
      where: { oauthFamilyId: familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
  logAction({
    actor: "oauth:system",
    action: "update",
    entity: "OAuthGrant",
    entityId: familyId,
    summary: reason,
  });
}

export async function exchangeRefreshToken(args: {
  client: OAuthClient;
  refreshToken: string;
}): Promise<TokenResponse> {
  const row = await prisma.oAuthRefreshToken.findUnique({
    where: { tokenHash: sha256hex(args.refreshToken) },
  });
  if (!row || row.clientId !== args.client.id) {
    throw new OAuthGrantError("invalid_grant", "unknown refresh token");
  }

  // A rotated or revoked token being presented again means the old value
  // leaked — kill the whole family (refresh chain + its access tokens).
  if (row.rotatedAt || row.revokedAt) {
    await revokeFamily(
      row.familyId,
      `refresh-token reuse detected — family revoked (client ${args.client.clientId})`,
    );
    console.warn(
      `[oauth] refresh-token reuse detected — family ${row.familyId} revoked (client ${args.client.clientId})`,
    );
    throw new OAuthGrantError(
      "invalid_grant",
      "refresh token is no longer valid",
    );
  }
  if (row.expiresAt.getTime() < Date.now()) {
    throw new OAuthGrantError("invalid_grant", "refresh token expired");
  }

  // Atomic rotation claim — a concurrent duplicate refresh loses.
  const claimed = await prisma.oAuthRefreshToken.updateMany({
    where: { id: row.id, rotatedAt: null, revokedAt: null },
    data: { rotatedAt: new Date() },
  });
  if (claimed.count === 0) {
    throw new OAuthGrantError(
      "invalid_grant",
      "refresh token is no longer valid",
    );
  }

  const admin = await prisma.adminUser.findUnique({
    where: { id: row.userId },
    select: { id: true, email: true },
  });
  if (!admin) {
    await revokeFamily(
      row.familyId,
      "granting admin account no longer exists — family revoked",
    );
    throw new OAuthGrantError(
      "invalid_grant",
      "the approving admin account no longer exists",
    );
  }

  return issueTokens({
    client: args.client,
    userId: admin.id,
    adminEmail: admin.email,
    grantRole: row.grantRole,
    scope: row.scope,
    familyId: row.familyId,
  });
}

// ─── RFC 7009 revocation ─────────────────────────────────────────────────────

// Unknown tokens succeed silently per spec — revocation must not be an oracle.
export async function revokeGrantToken(
  client: OAuthClient,
  token: string,
): Promise<void> {
  const hash = sha256hex(token);

  const refresh = await prisma.oAuthRefreshToken.findUnique({
    where: { tokenHash: hash },
  });
  if (refresh && refresh.clientId === client.id) {
    await revokeFamily(
      refresh.familyId,
      `grant revoked by client (${client.clientName ?? client.clientId})`,
    );
    return;
  }

  const access = await prisma.mcpToken.findUnique({
    where: { tokenHash: hash },
  });
  if (access && access.oauthClientId === client.id && !access.revokedAt) {
    await prisma.mcpToken.update({
      where: { id: access.id },
      data: { revokedAt: new Date() },
    });
  }
}
