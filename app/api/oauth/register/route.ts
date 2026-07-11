export const dynamic = "force-dynamic";

// RFC 7591 Dynamic Client Registration — anonymous by design: hosted
// connectors self-register before any user is involved. A client row grants
// no access on its own; every grant still requires owner consent.

import { logAction } from "@/lib/audit";
import { OAuthRegistrationError, registerClient } from "@/lib/oauth/clients";
import { corsPreflight, oauthJson } from "@/lib/oauth/http";
import { clientIp, rateLimit } from "@/lib/oauth/rate-limit";

export async function POST(req: Request) {
  if (!rateLimit(`register:${clientIp(req)}`, 20, 15 * 60 * 1000)) {
    return oauthJson(
      {
        error: "invalid_client_metadata",
        error_description: "too many registration requests",
      },
      { status: 429 },
    );
  }

  let meta: unknown;
  try {
    meta = await req.json();
  } catch {
    meta = null;
  }
  if (!meta || typeof meta !== "object") {
    return oauthJson(
      {
        error: "invalid_client_metadata",
        error_description: "request body must be a JSON object",
      },
      { status: 400 },
    );
  }

  try {
    const { row, clientSecret } = await registerClient(
      meta as Record<string, unknown>,
    );
    logAction({
      actor: "oauth:dcr",
      action: "create",
      entity: "OAuthClient",
      entityId: row.id,
      summary: row.clientName ?? row.clientId,
    });
    return oauthJson(
      {
        client_id: row.clientId,
        ...(clientSecret
          ? { client_secret: clientSecret, client_secret_expires_at: 0 }
          : {}),
        client_id_issued_at: Math.floor(row.createdAt.getTime() / 1000),
        ...(row.clientName ? { client_name: row.clientName } : {}),
        redirect_uris: row.redirectUris,
        grant_types: row.grantTypes,
        response_types: ["code"],
        token_endpoint_auth_method: row.tokenEndpointAuthMethod,
        scope: row.scope,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof OAuthRegistrationError) {
      return oauthJson(
        { error: err.code, error_description: err.message },
        { status: 400 },
      );
    }
    console.error("[oauth/register]", err);
    return oauthJson(
      { error: "invalid_client_metadata", error_description: "registration failed" },
      { status: 500 },
    );
  }
}

export function OPTIONS() {
  return corsPreflight();
}
