import { describe, it, expect } from "vitest";
import { extractOrderDigits, formatDateKathmandu } from "@/lib/invoice/number";

describe("Invoice number formatting", () => {
  describe("extractOrderDigits", () => {
    it("extracts digits from order number SK-000042", () => {
      expect(extractOrderDigits("SK-000042")).toBe("SK000042");
    });

    it("handles various order formats", () => {
      expect(extractOrderDigits("SK-000001")).toBe("SK000001");
      expect(extractOrderDigits("ABC-12345")).toBe("ABC12345");
      expect(extractOrderDigits("X-999")).toBe("X999");
    });

    it("returns unchanged string if no dashes", () => {
      expect(extractOrderDigits("SK000042")).toBe("SK000042");
    });
  });

  describe("formatDateKathmandu", () => {
    it("formats UTC date correctly to Asia/Kathmandu time", () => {
      // Create a UTC date: 2026-07-11 00:00:00 UTC
      // In Asia/Kathmandu (UTC+5:45), this is 2026-07-11 05:45:00
      const utcDate = new Date("2026-07-11T00:00:00Z");
      const result = formatDateKathmandu(utcDate);
      expect(result).toBe("20260711");
    });

    it("handles date boundary correctly", () => {
      // 2026-07-10 19:00:00 UTC = 2026-07-11 00:45:00 in Kathmandu (still 11th)
      const utcDate = new Date("2026-07-10T19:00:00Z");
      const result = formatDateKathmandu(utcDate);
      expect(result).toBe("20260711");
    });

    it("pads month and day with zeros", () => {
      // 2026-01-05 00:00:00 UTC = 2026-01-05 05:45:00 in Kathmandu
      const utcDate = new Date("2026-01-05T00:00:00Z");
      const result = formatDateKathmandu(utcDate);
      expect(result).toBe("20260105");
    });
  });
});
