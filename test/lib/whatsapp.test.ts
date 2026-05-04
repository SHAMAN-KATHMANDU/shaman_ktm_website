import { describe, it, expect } from "vitest";
import { buildEnquireUrl } from "@/lib/whatsapp";

describe("whatsapp/buildEnquireUrl", () => {
  it("generates a wa.me URL with product name + URL", () => {
    const url = buildEnquireUrl({
      productName: "Singing Bowl",
      productUrl: "https://shamankathmandu.com/products/singing-bowl",
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    const decoded = decodeURIComponent(url.split("?text=")[1]!);
    expect(decoded).toContain("Singing Bowl");
    expect(decoded).toContain("singing-bowl");
  });

  it("falls back to a generic message", () => {
    const url = buildEnquireUrl();
    const decoded = decodeURIComponent(url.split("?text=")[1]!);
    expect(decoded).toContain("Shaman Kathmandu");
  });

  it("uses serviceName for booking flow", () => {
    const url = buildEnquireUrl({ serviceName: "Sound Bath" });
    const decoded = decodeURIComponent(url.split("?text=")[1]!);
    expect(decoded).toContain("Sound Bath");
    expect(decoded).toContain("book");
  });
});
