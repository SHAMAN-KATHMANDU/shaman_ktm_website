export const dynamic = "force-dynamic";

// MCP endpoint (Streamable HTTP, stateless JSON mode). NOT covered by
// middleware.ts on purpose: MCP clients are non-browser, so cookie/CSRF
// gating doesn't apply — auth is the Bearer token verified below against the
// McpToken table (managed at /sysuser/mcp-tokens).

import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { verifyMcpToken } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const ctx = bearer ? await verifyMcpToken(bearer) : null;
  if (!ctx) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: {
          code: -32001,
          message:
            "Unauthorized — pass a valid MCP token as `Authorization: Bearer smk_mcp_…` (create one at /sysuser/mcp-tokens).",
        },
        id: null,
      },
      { status: 401 },
    );
  }

  // Fresh server + transport per request: no shared state, no session ids.
  const server = createMcpServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(req);
}

// Stateless server: no SSE stream to subscribe to, no session to delete.
export async function GET() {
  return NextResponse.json(
    { message: "Method not allowed — POST JSON-RPC messages to this endpoint." },
    { status: 405 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    { message: "Method not allowed — this MCP server is stateless." },
    { status: 405 },
  );
}
