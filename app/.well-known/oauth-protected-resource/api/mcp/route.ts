export const dynamic = "force-dynamic";

// RFC 9728 protected-resource metadata for /api/mcp. The 401 from that
// endpoint carries `WWW-Authenticate: Bearer resource_metadata="<this URL>"`;
// connectors fetch this to learn which authorization server protects it.

import { protectedResourceMetadata, resolveOrigin } from "@/lib/oauth/constants";
import { corsPreflight, oauthJson } from "@/lib/oauth/http";

export async function GET(req: Request) {
  return oauthJson(protectedResourceMetadata(resolveOrigin(req)));
}

export function OPTIONS() {
  return corsPreflight();
}
