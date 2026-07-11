export const dynamic = "force-dynamic";

// MCP endpoint (Streamable HTTP, stateless JSON mode). NOT covered by
// proxy.ts session/CSRF gating on purpose: MCP clients are non-browser, so
// auth is the Bearer token verified below against the McpToken table —
// either hand-created at /sysuser/mcp-tokens or minted by the OAuth 2.1 flow
// (/api/oauth/*), which issues the same smk_mcp_ tokens.
//
// The 401 carries `WWW-Authenticate: Bearer resource_metadata=…` — that
// header is how hosted connectors (claude.ai, ChatGPT) discover the OAuth
// authorization server (RFC 9728). CORS is open: Bearer-authed, no cookies.

import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { verifyMcpToken } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";
import { resolveOrigin, resourceMetadataUrl } from "@/lib/oauth/constants";
import { OAUTH_CORS_HEADERS, corsPreflight } from "@/lib/oauth/http";

function unauthorized(req: Request, hadToken: boolean): NextResponse {
  const challenge = [
    `Bearer resource_metadata="${resourceMetadataUrl(resolveOrigin(req))}"`,
    ...(hadToken ? ['error="invalid_token"'] : []),
  ].join(", ");
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      error: {
        code: -32001,
        message:
          "Unauthorized — connect via OAuth, or pass a valid MCP token as `Authorization: Bearer smk_mcp_…` (create one at /sysuser/mcp-tokens).",
      },
      id: null,
    },
    {
      status: 401,
      headers: { ...OAUTH_CORS_HEADERS, "WWW-Authenticate": challenge },
    },
  );
}

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const ctx = bearer ? await verifyMcpToken(bearer) : null;
  if (!ctx) return unauthorized(req, bearer.length > 0);

  // Fresh server + transport per request: no shared state, no session ids.
  const server = createMcpServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  const res = await transport.handleRequest(req);
  for (const [key, value] of Object.entries(OAUTH_CORS_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

export function OPTIONS() {
  return corsPreflight();
}

// Stateless server: no SSE stream to subscribe to, no session to delete.
export async function GET() {
  return NextResponse.json(
    { message: "Method not allowed — POST JSON-RPC messages to this endpoint." },
    { status: 405, headers: OAUTH_CORS_HEADERS },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { message: "Method not allowed — this MCP server is stateless." },
    { status: 405, headers: OAUTH_CORS_HEADERS },
  );
}
