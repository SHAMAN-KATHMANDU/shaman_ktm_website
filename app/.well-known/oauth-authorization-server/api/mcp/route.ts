export const dynamic = "force-dynamic";

// Path-suffixed variant of the RFC 8414 document: some MCP clients append the
// resource path ("/api/mcp") to the well-known URL when probing. Same content
// as /.well-known/oauth-authorization-server.

import { authServerMetadata, resolveOrigin } from "@/lib/oauth/constants";
import { corsPreflight, oauthJson } from "@/lib/oauth/http";

export async function GET(req: Request) {
  return oauthJson(authServerMetadata(resolveOrigin(req)));
}

export function OPTIONS() {
  return corsPreflight();
}
