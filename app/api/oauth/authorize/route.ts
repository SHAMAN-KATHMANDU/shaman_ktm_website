export const dynamic = "force-dynamic";

// OAuth 2.1 authorization endpoint. Validates the request, stores a pending
// OAuthAuthorizationRequest (no admin bound yet), and sends the browser to
// the consent page behind the normal sysuser login.
//
// Error routing follows RFC 6749 §4.1.2.1: problems with client_id or
// redirect_uri are answered directly (never redirect to an unvalidated URI);
// everything after redirect_uri validation goes back to the client as
// ?error=… on the redirect URI.

import { NextResponse } from "next/server";
import { getClientByClientId } from "@/lib/oauth/clients";
import { createAuthorizationRequest } from "@/lib/oauth/grants";
import {
  CONSENT_PAGE_PATH,
  MCP_SCOPE,
  mcpResourceUrl,
  resolveOrigin,
  sameResource,
} from "@/lib/oauth/constants";
import { corsPreflight, oauthError, parseOAuthBody } from "@/lib/oauth/http";
import { clientIp, rateLimit } from "@/lib/oauth/rate-limit";

export async function GET(req: Request) {
  const params = Object.fromEntries(new URL(req.url).searchParams);
  return handleAuthorize(req, params);
}

export async function POST(req: Request) {
  return handleAuthorize(req, await parseOAuthBody(req));
}

export function OPTIONS() {
  return corsPreflight();
}

async function handleAuthorize(
  req: Request,
  params: Record<string, string>,
): Promise<Response> {
  if (!rateLimit(`authorize:${clientIp(req)}`, 30, 15 * 60 * 1000)) {
    return oauthError("invalid_request", "too many requests", 429);
  }

  if (!params.client_id) {
    return oauthError("invalid_request", "client_id is required");
  }
  const client = await getClientByClientId(params.client_id);
  if (!client) {
    return oauthError("invalid_client", "unknown client_id", 400);
  }

  let redirectUri = params.redirect_uri;
  if (redirectUri) {
    if (!client.redirectUris.includes(redirectUri)) {
      return oauthError(
        "invalid_request",
        "redirect_uri is not registered for this client",
      );
    }
  } else if (client.redirectUris.length === 1) {
    redirectUri = client.redirectUris[0];
  } else {
    return oauthError("invalid_request", "redirect_uri is required");
  }

  // From here on the redirect target is trusted — report errors to it.
  const fail = (error: string, description: string) => {
    const url = new URL(redirectUri);
    url.searchParams.set("error", error);
    url.searchParams.set("error_description", description);
    if (params.state) url.searchParams.set("state", params.state);
    return NextResponse.redirect(url, 302);
  };

  if (params.response_type !== "code") {
    return fail(
      "unsupported_response_type",
      'only the "code" response type is supported',
    );
  }
  if (!params.code_challenge) {
    return fail("invalid_request", "code_challenge is required (PKCE)");
  }
  if ((params.code_challenge_method ?? "S256") !== "S256") {
    return fail(
      "invalid_request",
      "only the S256 code_challenge_method is supported",
    );
  }
  const scope = params.scope || MCP_SCOPE;
  if (scope.split(" ").some((s) => s !== MCP_SCOPE)) {
    return fail("invalid_scope", `only the "${MCP_SCOPE}" scope is supported`);
  }
  const origin = resolveOrigin(req);
  if (params.resource) {
    const canonical = mcpResourceUrl(origin);
    if (!sameResource(params.resource, canonical)) {
      return fail(
        "invalid_target",
        `resource must be the MCP endpoint ${canonical}`,
      );
    }
  }

  const request = await createAuthorizationRequest({
    client,
    redirectUri,
    state: params.state,
    scope,
    resource: params.resource,
    codeChallenge: params.code_challenge,
  });

  const consentUrl = new URL(`${origin}${CONSENT_PAGE_PATH}`);
  consentUrl.searchParams.set("request_id", request.id);
  return NextResponse.redirect(consentUrl, 302);
}
