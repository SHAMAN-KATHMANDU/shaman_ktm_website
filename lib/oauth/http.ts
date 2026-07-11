// Shared HTTP plumbing for the OAuth + MCP endpoints: open CORS (these are
// Bearer/PKCE-authed with no cookies, so `*` is safe and hosted connectors
// require it), RFC 6749 error bodies, tolerant body parsing (connectors send
// form-encoded or JSON), and client-credential extraction.

import { NextResponse } from "next/server";

export const OAUTH_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, mcp-protocol-version, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
};

export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: OAUTH_CORS_HEADERS });
}

export function oauthJson(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): NextResponse {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      ...OAUTH_CORS_HEADERS,
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      ...init?.headers,
    },
  });
}

export type OAuthErrorCode =
  | "invalid_request"
  | "invalid_client"
  | "invalid_grant"
  | "unauthorized_client"
  | "unsupported_grant_type"
  | "unsupported_response_type"
  | "invalid_scope"
  | "invalid_target"
  | "access_denied"
  | "invalid_client_metadata"
  | "invalid_redirect_uri"
  | "server_error";

export function oauthError(
  error: OAuthErrorCode,
  description: string,
  status?: number,
): NextResponse {
  // invalid_client is special-cased by RFC 6749 §5.2: 401 + WWW-Authenticate.
  const headers: Record<string, string> = {};
  let code = status ?? 400;
  if (error === "invalid_client") {
    code = status ?? 401;
    headers["WWW-Authenticate"] = 'Basic realm="oauth", charset="UTF-8"';
  }
  return oauthJson(
    { error, error_description: description },
    { status: code, headers },
  );
}

/** Body parser for token/revoke: application/x-www-form-urlencoded (spec) or JSON. */
export async function parseOAuthBody(
  req: Request,
): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const json = (await req.json()) as unknown;
      if (!json || typeof json !== "object") return {};
      return Object.fromEntries(
        Object.entries(json).filter(
          (entry): entry is [string, string] => typeof entry[1] === "string",
        ),
      );
    }
    const form = await req.formData();
    const out: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export interface ClientCredentials {
  clientId?: string;
  clientSecret?: string;
}

// RFC 6749 §2.3.1 — HTTP Basic (values form-urlencoded before base64) takes
// precedence over client_id/client_secret body params.
export function extractClientCredentials(
  req: Request,
  body: Record<string, string>,
): ClientCredentials {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
      const sep = decoded.indexOf(":");
      if (sep === -1) return {};
      return {
        clientId: decodeURIComponent(decoded.slice(0, sep)),
        clientSecret: decodeURIComponent(decoded.slice(sep + 1)) || undefined,
      };
    } catch {
      return {};
    }
  }
  return {
    clientId: body.client_id || undefined,
    clientSecret: body.client_secret || undefined,
  };
}
