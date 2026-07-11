export const dynamic = "force-dynamic";

// OAuth 2.1 token endpoint: authorization_code exchange (PKCE-verified) and
// refresh_token rotation. Success responses carry an access token that is a
// regular McpToken row (smk_mcp_…) usable directly against /api/mcp.

import {
  getClientByClientId,
  verifyClientSecret,
} from "@/lib/oauth/clients";
import {
  OAuthGrantError,
  exchangeAuthorizationCode,
  exchangeRefreshToken,
} from "@/lib/oauth/grants";
import { resolveOrigin } from "@/lib/oauth/constants";
import {
  corsPreflight,
  extractClientCredentials,
  oauthError,
  oauthJson,
  parseOAuthBody,
} from "@/lib/oauth/http";
import { clientIp, rateLimit } from "@/lib/oauth/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`token:${clientIp(req)}`, 60, 15 * 60 * 1000)) {
    return oauthError("invalid_request", "too many requests", 429);
  }

  const body = await parseOAuthBody(req);
  const creds = extractClientCredentials(req, body);
  if (!creds.clientId) {
    return oauthError("invalid_client", "client authentication required");
  }
  const client = await getClientByClientId(creds.clientId);
  if (!client || !verifyClientSecret(client, creds.clientSecret)) {
    return oauthError("invalid_client", "client authentication failed");
  }

  try {
    switch (body.grant_type) {
      case "authorization_code": {
        if (!body.code) {
          return oauthError("invalid_request", "code is required");
        }
        if (!body.code_verifier) {
          return oauthError(
            "invalid_request",
            "code_verifier is required (PKCE)",
          );
        }
        const tokens = await exchangeAuthorizationCode({
          client,
          code: body.code,
          codeVerifier: body.code_verifier,
          redirectUri: body.redirect_uri || undefined,
          resource: body.resource || undefined,
          origin: resolveOrigin(req),
        });
        return oauthJson(tokens);
      }
      case "refresh_token": {
        if (!body.refresh_token) {
          return oauthError("invalid_request", "refresh_token is required");
        }
        const tokens = await exchangeRefreshToken({
          client,
          refreshToken: body.refresh_token,
        });
        return oauthJson(tokens);
      }
      default:
        return oauthError(
          "unsupported_grant_type",
          `grant_type "${body.grant_type ?? ""}" is not supported`,
        );
    }
  } catch (err) {
    if (err instanceof OAuthGrantError) {
      return oauthError(err.code, err.message);
    }
    console.error("[oauth/token]", err);
    return oauthError("server_error", "token issuance failed", 500);
  }
}

export function OPTIONS() {
  return corsPreflight();
}
