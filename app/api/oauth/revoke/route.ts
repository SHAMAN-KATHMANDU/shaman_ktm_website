export const dynamic = "force-dynamic";

// RFC 7009 token revocation. Refresh tokens revoke their whole family
// (rotation chain + access tokens); access tokens revoke just themselves.
// Unknown tokens return 200 — the endpoint must not be a validity oracle.

import {
  getClientByClientId,
  verifyClientSecret,
} from "@/lib/oauth/clients";
import { revokeGrantToken } from "@/lib/oauth/grants";
import {
  corsPreflight,
  extractClientCredentials,
  oauthError,
  oauthJson,
  parseOAuthBody,
} from "@/lib/oauth/http";
import { clientIp, rateLimit } from "@/lib/oauth/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`revoke:${clientIp(req)}`, 60, 15 * 60 * 1000)) {
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

  if (!body.token) {
    return oauthError("invalid_request", "token is required");
  }

  try {
    await revokeGrantToken(client, body.token);
  } catch (err) {
    console.error("[oauth/revoke]", err);
    return oauthError("server_error", "revocation failed", 500);
  }
  return oauthJson({});
}

export function OPTIONS() {
  return corsPreflight();
}
