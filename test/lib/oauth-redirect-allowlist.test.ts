// Dynamic client registration is anonymous: any https redirect_uri used to be
// accepted, so anyone could mint a consent link that sends the code to them.

import { describe, expect, it } from "vitest";
import { isAllowedRedirectUri } from "@/lib/oauth/clients";

describe("isAllowedRedirectUri", () => {
  it.each([
    "https://claude.ai/api/mcp/auth_callback",
    "https://claude.com/api/mcp/auth_callback",
    "https://chatgpt.com/connector_platform_oauth_redirect",
    "http://localhost:6274/oauth/callback",
    "http://127.0.0.1:33418/callback",
    "http://[::1]:8080/cb",
  ])("allows %s", (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(true);
  });

  it.each([
    "https://evil.example/cb",
    "https://claude.ai.evil.example/cb",
    "https://evilclaude.ai/cb",
    "http://claude.ai/api/mcp/auth_callback",
    "javascript:alert(1)",
    "not a url",
  ])("refuses %s", (uri) => {
    expect(isAllowedRedirectUri(uri)).toBe(false);
  });
});
