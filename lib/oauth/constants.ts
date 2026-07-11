// Protocol constants and URL resolution for the OAuth 2.1 layer that fronts
// /api/mcp for remote connectors (claude.ai, ChatGPT, Claude Desktop).
//
// Design (ported from the projectX Express implementation to Next.js):
// access tokens minted via /api/oauth/token ARE ordinary McpToken rows — the
// same opaque `smk_mcp_…` format verifyMcpToken() already checks — so tool
// RBAC, revocation, and audit need no OAuth-specific handling.

import { env } from "@/lib/env";

export const MCP_SCOPE = "mcp";
export const MCP_PATH = "/api/mcp";

export const AUTHORIZE_PATH = "/api/oauth/authorize";
export const TOKEN_PATH = "/api/oauth/token";
export const REGISTER_PATH = "/api/oauth/register";
export const REVOKE_PATH = "/api/oauth/revoke";
export const CONSENT_PAGE_PATH = "/sysuser/oauth-consent";

// Pending consent window; tightened to CODE_TTL_MS once approved so the
// single-use code can't linger.
export const AUTH_REQUEST_TTL_MS = 10 * 60 * 1000;
export const CODE_TTL_MS = 60 * 1000;
export const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // refresh handles the rest
export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_REDIRECT_URIS = 10;

// The public origin used as the OAuth issuer and in metadata documents.
// NEXT_PUBLIC_SITE_URL wins (stable behind the nginx proxy); otherwise fall
// back to forwarded headers so local dev works without config.
export function resolveOrigin(req: Request): string {
  if (env.NEXT_PUBLIC_SITE_URL) {
    return env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  }
  const url = new URL(req.url);
  const proto =
    req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host =
    req.headers.get("x-forwarded-host") ??
    req.headers.get("host") ??
    url.host;
  return `${proto}://${host}`;
}

/** Canonical RFC 8707 resource identifier for this MCP server. */
export function mcpResourceUrl(origin: string): string {
  return `${origin}${MCP_PATH}`;
}

// RFC 3986: scheme + host compare case-insensitively (URL.origin lowercases
// both and drops default ports); trailing slashes are insignificant here.
export function sameResource(a: string, b: string): boolean {
  try {
    const norm = (raw: string) => {
      const url = new URL(raw);
      return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
    };
    return norm(a) === norm(b);
  } catch {
    return false;
  }
}

/** RFC 9728 resource-metadata URL advertised in the 401 WWW-Authenticate. */
export function resourceMetadataUrl(origin: string): string {
  return `${origin}/.well-known/oauth-protected-resource${MCP_PATH}`;
}

/** RFC 8414 authorization-server metadata document. */
export function authServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}${AUTHORIZE_PATH}`,
    token_endpoint: `${origin}${TOKEN_PATH}`,
    registration_endpoint: `${origin}${REGISTER_PATH}`,
    revocation_endpoint: `${origin}${REVOKE_PATH}`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: [
      "none",
      "client_secret_basic",
      "client_secret_post",
    ],
    revocation_endpoint_auth_methods_supported: [
      "none",
      "client_secret_basic",
      "client_secret_post",
    ],
    scopes_supported: [MCP_SCOPE],
  };
}

/** RFC 9728 protected-resource metadata document. */
export function protectedResourceMetadata(origin: string) {
  return {
    resource: mcpResourceUrl(origin),
    authorization_servers: [origin],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "Shaman Kathmandu CMS MCP",
  };
}
