import { describe, it, expect } from "vitest";
import { toNe, withLocales } from "@/lib/sitemap-locales";

describe("sitemap-locales", () => {
  const ORIGIN = "https://www.shamankathmandu.com";

  describe("toNe", () => {
    it("converts English URL to Nepali variant", () => {
      const url = `${ORIGIN}/products/singing-bowl`;
      const result = toNe(url, ORIGIN);
      expect(result).toBe(`${ORIGIN}/ne/products/singing-bowl`);
    });

    it("handles root path", () => {
      const url = `${ORIGIN}/`;
      const result = toNe(url, ORIGIN);
      expect(result).toBe(`${ORIGIN}/ne`);
    });

    it("handles root without trailing slash", () => {
      const url = ORIGIN;
      const result = toNe(url, ORIGIN);
      expect(result).toBe(`${ORIGIN}/ne`);
    });
  });

  describe("withLocales", () => {
    it("emits each URL in both locales with hreflang alternates", () => {
      const entries = [{ url: `${ORIGIN}/products/bowl`, lastModified: new Date() }];
      const result = withLocales(entries, ORIGIN);

      expect(result).toHaveLength(2);
      // English entry
      expect(result[0]?.url).toBe(`${ORIGIN}/products/bowl`);
      expect(result[0]?.alternates?.languages).toEqual({
        en: `${ORIGIN}/products/bowl`,
        ne: `${ORIGIN}/ne/products/bowl`,
        "x-default": `${ORIGIN}/products/bowl`,
      });
      // Nepali entry
      expect(result[1]?.url).toBe(`${ORIGIN}/ne/products/bowl`);
      expect(result[1]?.alternates?.languages).toEqual({
        en: `${ORIGIN}/products/bowl`,
        ne: `${ORIGIN}/ne/products/bowl`,
        "x-default": `${ORIGIN}/products/bowl`,
      });
    });

    it("includes x-default pointing to English URL", () => {
      const entries = [{ url: `${ORIGIN}/energy/sound-bath` }];
      const result = withLocales(entries, ORIGIN);

      // Check both English and Nepali entries have x-default pointing to English
      result.forEach((entry) => {
        expect(entry.alternates?.languages?.["x-default"]).toBe(
          `${ORIGIN}/energy/sound-bath`
        );
      });
    });

    it("preserves other entry properties", () => {
      const entries = [
        {
          url: `${ORIGIN}/products/bowl`,
          changeFrequency: "weekly" as const,
          priority: 0.8,
          lastModified: new Date("2024-10-01"),
        },
      ];
      const result = withLocales(entries, ORIGIN);

      expect(result[0]?.changeFrequency).toBe("weekly");
      expect(result[0]?.priority).toBe(0.8);
      expect(result[0]?.lastModified).toEqual(new Date("2024-10-01"));
      expect(result[1]?.changeFrequency).toBe("weekly");
      expect(result[1]?.priority).toBe(0.8);
      expect(result[1]?.lastModified).toEqual(new Date("2024-10-01"));
    });
  });
});
