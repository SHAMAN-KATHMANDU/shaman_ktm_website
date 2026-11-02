import { describe, it, expect, beforeEach, vi } from "vitest";

describe("siteUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear environment variables before each test
    delete process.env.SITE_ORIGIN;
    delete process.env.NEXT_PUBLIC_PROJECTX_ORIGIN;
  });

  it("returns SITE_ORIGIN when set", async () => {
    process.env.SITE_ORIGIN = "https://example.com";
    const { siteUrl } = await import("@/lib/site-url");
    expect(siteUrl).toBe("https://example.com");
  });

  it("falls back to NEXT_PUBLIC_PROJECTX_ORIGIN when SITE_ORIGIN is unset", async () => {
    delete process.env.SITE_ORIGIN;
    process.env.NEXT_PUBLIC_PROJECTX_ORIGIN = "https://public.example.com";
    const { siteUrl } = await import("@/lib/site-url");
    expect(siteUrl).toBe("https://public.example.com");
  });

  it("falls back to www domain when both env vars are unset", async () => {
    delete process.env.SITE_ORIGIN;
    delete process.env.NEXT_PUBLIC_PROJECTX_ORIGIN;
    const { siteUrl } = await import("@/lib/site-url");
    expect(siteUrl).toBe("https://www.shamankathmandu.com");
  });

  it("prefers SITE_ORIGIN over NEXT_PUBLIC_PROJECTX_ORIGIN", async () => {
    process.env.SITE_ORIGIN = "https://site-origin.example.com";
    process.env.NEXT_PUBLIC_PROJECTX_ORIGIN = "https://public.example.com";
    const { siteUrl } = await import("@/lib/site-url");
    expect(siteUrl).toBe("https://site-origin.example.com");
  });

  it("treats blank SITE_ORIGIN as unset (uses fallback)", async () => {
    process.env.SITE_ORIGIN = "   ";
    delete process.env.NEXT_PUBLIC_PROJECTX_ORIGIN;
    const { siteUrl } = await import("@/lib/site-url");
    expect(siteUrl).toBe("https://www.shamankathmandu.com");
  });

  it("strips trailing slashes", async () => {
    process.env.SITE_ORIGIN = "https://example.com///";
    const { siteUrl } = await import("@/lib/site-url");
    expect(siteUrl).toBe("https://example.com");
  });

  it("defaults to www.shamankathmandu.com, not apex", async () => {
    // Regression test: the apex domain should not be hardcoded as fallback
    // The apex 403s bots on Cloudflare, www canonicalizes.
    delete process.env.SITE_ORIGIN;
    delete process.env.NEXT_PUBLIC_PROJECTX_ORIGIN;
    const { siteUrl } = await import("@/lib/site-url");
    expect(siteUrl).toContain("www.shamankathmandu.com");
    expect(siteUrl).not.toBe("https://shamankathmandu.com");
  });
});
