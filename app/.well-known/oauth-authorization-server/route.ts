export const dynamic = "force-dynamic";

// RFC 8414 authorization-server metadata. Hosted MCP connectors discover the
// OAuth endpoints here (pointed at us by the resource metadata / the 401
// WWW-Authenticate header on /api/mcp).

import { authServerMetadata, resolveOrigin } from "@/lib/oauth/constants";
import { corsPreflight, oauthJson } from "@/lib/oauth/http";

export async function GET(req: Request) {
  return oauthJson(authServerMetadata(resolveOrigin(req)));
}

export function OPTIONS() {
  return corsPreflight();
}
