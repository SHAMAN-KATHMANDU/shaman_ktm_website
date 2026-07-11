// Dynamic Client Registration (RFC 7591) + client authentication.
// Registration is anonymous: hosted connectors (claude.ai, ChatGPT) register
// themselves before any user is involved, so a client row carries no
// authority by itself — authority enters only at consent approval.
//
// Secrets are sha256-hashed at rest (we own the comparison, so a hash is
// strictly safer than reversible encryption and needs no key management).
// Most connectors register as public clients (`token_endpoint_auth_method:
// "none"`) and prove possession via PKCE instead.

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { OAuthClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { MAX_REDIRECT_URIS, MCP_SCOPE } from "./constants";

export function sha256hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export class OAuthRegistrationError extends Error {
  constructor(
    public code: "invalid_client_metadata" | "invalid_redirect_uri",
    message: string,
  ) {
    super(message);
  }
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const AUTH_METHODS = new Set(["none", "client_secret_basic", "client_secret_post"]);
const GRANT_TYPES = new Set(["authorization_code", "refresh_token"]);

function assertValidRedirectUri(uri: string): void {
  let parsed: URL;
  try {
    parsed = new URL(uri);
  } catch {
    throw new OAuthRegistrationError(
      "invalid_redirect_uri",
      `redirect_uri "${uri}" is not a valid absolute URL`,
    );
  }
  if (parsed.protocol === "https:") return;
  if (parsed.protocol === "http:" && LOOPBACK_HOSTS.has(parsed.hostname)) return;
  throw new OAuthRegistrationError(
    "invalid_redirect_uri",
    `redirect_uri "${uri}" must be https:// or an http:// loopback URL`,
  );
}

export interface RegistrationResult {
  row: OAuthClient;
  /** Present only for confidential clients; shown to the registrant once. */
  clientSecret?: string;
}

export async function registerClient(
  meta: Record<string, unknown>,
): Promise<RegistrationResult> {
  const redirectUris = Array.isArray(meta.redirect_uris)
    ? meta.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];
  if (redirectUris.length === 0) {
    throw new OAuthRegistrationError(
      "invalid_redirect_uri",
      "redirect_uris must be a non-empty array of URLs",
    );
  }
  if (redirectUris.length > MAX_REDIRECT_URIS) {
    throw new OAuthRegistrationError(
      "invalid_redirect_uri",
      `at most ${MAX_REDIRECT_URIS} redirect_uris are allowed`,
    );
  }
  redirectUris.forEach(assertValidRedirectUri);

  const authMethod =
    typeof meta.token_endpoint_auth_method === "string"
      ? meta.token_endpoint_auth_method
      : "none";
  if (!AUTH_METHODS.has(authMethod)) {
    throw new OAuthRegistrationError(
      "invalid_client_metadata",
      `unsupported token_endpoint_auth_method "${authMethod}"`,
    );
  }

  const grantTypes =
    Array.isArray(meta.grant_types) && meta.grant_types.length > 0
      ? meta.grant_types.filter((g): g is string => typeof g === "string")
      : ["authorization_code", "refresh_token"];
  if (grantTypes.length === 0 || grantTypes.some((g) => !GRANT_TYPES.has(g))) {
    throw new OAuthRegistrationError(
      "invalid_client_metadata",
      "only the authorization_code and refresh_token grant types are supported",
    );
  }

  if (
    Array.isArray(meta.response_types) &&
    meta.response_types.some((r) => r !== "code")
  ) {
    throw new OAuthRegistrationError(
      "invalid_client_metadata",
      'only the "code" response type is supported',
    );
  }

  const clientName =
    typeof meta.client_name === "string" && meta.client_name.trim()
      ? meta.client_name.trim().slice(0, 200)
      : null;

  const clientId = `smk_oc_${randomBytes(16).toString("base64url")}`;
  const clientSecret =
    authMethod === "none" ? undefined : randomBytes(32).toString("base64url");

  const row = await prisma.oAuthClient.create({
    data: {
      clientId,
      clientSecretHash: clientSecret ? sha256hex(clientSecret) : null,
      clientName,
      redirectUris,
      grantTypes,
      tokenEndpointAuthMethod: authMethod,
      scope: MCP_SCOPE,
    },
  });
  return { row, clientSecret };
}

export async function getClientByClientId(
  clientId: string,
): Promise<OAuthClient | null> {
  const row = await prisma.oAuthClient.findUnique({ where: { clientId } });
  if (!row || row.revokedAt) return null;
  return row;
}

export function verifyClientSecret(
  client: OAuthClient,
  secret: string | undefined,
): boolean {
  // Public client: PKCE carries the proof of possession; no secret expected.
  if (client.tokenEndpointAuthMethod === "none") return true;
  if (!client.clientSecretHash || !secret) return false;
  const stored = Buffer.from(client.clientSecretHash, "hex");
  const presented = Buffer.from(sha256hex(secret), "hex");
  return stored.length === presented.length && timingSafeEqual(stored, presented);
}
