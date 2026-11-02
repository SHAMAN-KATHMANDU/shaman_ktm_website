import { describe, it, expect } from "vitest";
import { buildLlmsTxt } from "@/lib/llms-txt";

const base = {
  origin: "https://www.shamankathmandu.com/",
  contact: {},
  showrooms: [],
  categories: [],
  services: [],
  pages: [],
  posts: [],
};

describe("buildLlmsTxt", () => {
  it("links services to /energy with real duration and price only", () => {
    const txt = buildLlmsTxt({
      ...base,
      services: [
        { slug: "stupa", name: "Sound Healing (Stupa)", duration: "60 min", pricePerSession: 5000 },
        { slug: "custom", name: "Custom", duration: null, pricePerSession: 0 },
      ],
    });
    expect(txt).toContain("- [Sound Healing (Stupa)](https://www.shamankathmandu.com/energy/stupa): 60 min, NPR 5,000");
    expect(txt).toContain("- [Custom](https://www.shamankathmandu.com/energy/custom)\n");
    expect(txt).not.toContain("/services/");
  });

  it("lists showroom addresses and contact when present", () => {
    const txt = buildLlmsTxt({
      ...base,
      tagline: "Curated in Kathmandu.",
      contact: { phone: "+977 982-015-1135", email: "a@b.com" },
      showrooms: [{ name: "Thamel", address: "Mandala Street, Thamel, Kathmandu 44600" }],
    });
    expect(txt).toContain("> Curated in Kathmandu. Shop and sound-healing studio with 1 showroom in the Kathmandu Valley, Nepal.");
    expect(txt).toContain("- Thamel: Mandala Street, Thamel, Kathmandu 44600");
    expect(txt).toContain("- Phone / WhatsApp: +977 982-015-1135");
  });

  it("invents no summary when there is no data", () => {
    const txt = buildLlmsTxt(base);
    expect(txt.startsWith("# Shaman Kathmandu\n\n## Shop")).toBe(true);
    expect(txt).not.toContain("## Visit and contact");
  });
});
