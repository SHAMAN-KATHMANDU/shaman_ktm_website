import { describe, it, expect } from "vitest";
import {
  AttributionData,
  formatAttributionForSubmission,
  normalizeReferrerHost,
} from "@/lib/attribution";

describe("attribution", () => {
  describe("normalizeReferrerHost", () => {
    it("maps known AI hosts correctly", () => {
      expect(normalizeReferrerHost("https://chatgpt.com/path")).toBe("ai:chatgpt");
      expect(normalizeReferrerHost("https://chat.openai.com/path")).toBe("ai:chatgpt");
      expect(normalizeReferrerHost("https://perplexity.ai/search")).toBe("ai:perplexity");
      expect(normalizeReferrerHost("https://copilot.microsoft.com/")).toBe("ai:copilot");
      expect(normalizeReferrerHost("https://gemini.google.com/app")).toBe("ai:gemini");
      expect(normalizeReferrerHost("https://claude.ai/chat")).toBe("ai:claude");
    });

    it("returns regular hostname for non-AI sites", () => {
      expect(normalizeReferrerHost("https://google.com/search")).toBe("google.com");
      expect(normalizeReferrerHost("https://facebook.com/")).toBe("facebook.com");
    });

    it("returns null for invalid URLs", () => {
      expect(normalizeReferrerHost("not-a-url")).toBeNull();
      expect(normalizeReferrerHost("")).toBeNull();
    });
  });

  describe("formatAttributionForSubmission", () => {
    it("formats UTM parameters", () => {
      const attr: AttributionData = {
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "summer-sale",
      };
      const formatted = formatAttributionForSubmission(attr);
      expect(formatted).toContain("utm_source=google");
      expect(formatted).toContain("utm_medium=cpc");
      expect(formatted).toContain("utm_campaign=summer-sale");
    });

    it("includes referrer when present", () => {
      const attr: AttributionData = {
        referrer: "ai:chatgpt",
      };
      const formatted = formatAttributionForSubmission(attr);
      expect(formatted).toContain("referrer=ai:chatgpt");
    });

    it("truncates long click IDs", () => {
      const attr: AttributionData = {
        gclid: "ThisIsAVeryLongGclidValue123456789",
        fbclid: "ThisIsAVeryLongFbclidValue123456789",
      };
      const formatted = formatAttributionForSubmission(attr);
      expect(formatted).toContain("gclid=ThisIsAVeryLongGclid");
      expect(formatted).toContain("fbclid=ThisIsAVeryLongFbcli");
      // Verify the truncation is applied (substring before the dots)
      expect(formatted).toMatch(/gclid=[^ ]*\.\.\./);
      expect(formatted).toMatch(/fbclid=[^ ]*\.\.\./);
    });

    it("returns empty string for null or empty attribution", () => {
      expect(formatAttributionForSubmission(null)).toBe("");
      expect(formatAttributionForSubmission({})).toBe("");
    });

    it("handles mixed attribution data", () => {
      const attr: AttributionData = {
        utm_source: "facebook",
        utm_medium: "paid",
        fbclid: "shortid123",
      };
      const formatted = formatAttributionForSubmission(attr);
      expect(formatted).toContain("utm_source=facebook");
      expect(formatted).toContain("utm_medium=paid");
      expect(formatted).toContain("fbclid=shortid123");
    });
  });
});
