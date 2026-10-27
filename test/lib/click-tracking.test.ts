import { describe, it, expect } from "vitest";
import { getContactMethodFromHref } from "@/components/site/layout/click-tracking";

describe("click-tracking", () => {
  describe("getContactMethodFromHref", () => {
    it("identifies WhatsApp links", () => {
      expect(getContactMethodFromHref("https://wa.me/9841234567")).toBe("whatsapp");
      expect(getContactMethodFromHref("https://api.whatsapp.com/send?phone=9841234567")).toBe("whatsapp");
    });

    it("identifies phone links", () => {
      expect(getContactMethodFromHref("tel:+9841234567")).toBe("phone");
      expect(getContactMethodFromHref("tel:9841234567")).toBe("phone");
    });

    it("identifies email links", () => {
      expect(getContactMethodFromHref("mailto:hello@example.com")).toBe("email");
      expect(getContactMethodFromHref("mailto:hello@example.com?subject=Inquiry")).toBe("email");
    });

    it("returns null for non-contact links", () => {
      expect(getContactMethodFromHref("https://example.com")).toBeNull();
      expect(getContactMethodFromHref("/products")).toBeNull();
      expect(getContactMethodFromHref("")).toBeNull();
      expect(getContactMethodFromHref("https://facebook.com/shaman")).toBeNull();
    });

    it("is case-sensitive for protocol checks", () => {
      // Browsers normalize these, but our check should work
      expect(getContactMethodFromHref("HTTPS://WA.ME/123")).toBeNull();
      expect(getContactMethodFromHref("TEL:123")).toBeNull();
    });
  });
});
