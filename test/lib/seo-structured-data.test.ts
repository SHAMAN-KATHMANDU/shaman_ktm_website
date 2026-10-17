// Search-facing metadata and schema.org output.
//
// The listing pages used to ship one hardcoded English title each, so /ne/*
// served English titles with no canonical, and the home page had no canonical,
// no hreflang and no structured data at all. These pin the helpers that now
// build all of that.

import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/messages/en.json";
import ne from "@/lib/i18n/messages/ne.json";
import { fillSeo, metaDescription, pageMetadata, siteUrl } from "@/lib/seo";
import {
  ORGANIZATION_ID,
  organizationJsonLd,
  parseShowroomAddress,
  serviceJsonLd,
  showroomJsonLd,
  socialProfileUrls,
} from "@/lib/structured-data";

describe("pageMetadata", () => {
  it("canonicalises the Nepali page to /ne and cross-links both locales", () => {
    const m = pageMetadata(ne.seo.products, "/products", "ne");
    expect(m.title).toBe(ne.seo.products.title);
    expect(m.alternates?.canonical).toBe(`${siteUrl}/ne/products`);
    expect(m.alternates?.languages).toMatchObject({
      en: `${siteUrl}/products`,
      ne: `${siteUrl}/ne/products`,
      "x-default": `${siteUrl}/products`,
    });
    expect(m.openGraph).toMatchObject({ locale: "ne_NP", siteName: "Shaman Kathmandu" });
  });

  it("gives the home page a root canonical", () => {
    expect(pageMetadata(en.seo.home, "/", "en").alternates?.canonical).toBe(`${siteUrl}/`);
    expect(pageMetadata(ne.seo.home, "/", "ne").alternates?.canonical).toBe(`${siteUrl}/ne`);
  });

  it("marks noindex pages", () => {
    expect(pageMetadata(en.seo.search, "/search", "en", { noindex: true }).robots).toEqual({
      index: false,
      follow: false,
    });
  });
});

describe("SEO copy", () => {
  it("keeps titles inside what search results display", () => {
    for (const [key, copy] of Object.entries(en.seo)) {
      expect(copy.title.length, key).toBeLessThanOrEqual(70);
      if ("description" in copy) {
        expect(copy.description.length, key).toBeLessThanOrEqual(175);
      }
    }
  });

  it("fills the category name into both fields", () => {
    const c = fillSeo(en.seo.category, "Singing Bowls");
    expect(c.title).toBe("Singing Bowls in Kathmandu, Nepal | Shaman Kathmandu");
    expect(c.description).toContain("Shop Singing Bowls");
    expect(c.title + c.description).not.toContain("{name}");
  });
});

describe("metaDescription", () => {
  it("leaves short text alone and flattens whitespace", () => {
    expect(metaDescription("A  calm\n\nsession.")).toBe("A calm session.");
  });

  it("cuts long text at a word boundary with an ellipsis", () => {
    const text = "word ".repeat(80);
    const out = metaDescription(text);
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("word…")).toBe(true);
  });

  it("keeps a markdown link's label and drops its URL", () => {
    expect(metaDescription("Pair with [a **bowl**](https://x.test/b) today.")).toBe(
      "Pair with a bowl today.",
    );
  });

  it("treats null as empty", () => {
    expect(metaDescription(null)).toBe("");
  });
});

describe("parseShowroomAddress", () => {
  it("splits city and postcode off the last segment", () => {
    expect(parseShowroomAddress("Ruby's Collection, Jhamsikhel, Lalitpur 44700")).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Ruby's Collection, Jhamsikhel",
      addressLocality: "Lalitpur",
      postalCode: "44700",
      addressCountry: "NP",
    });
  });

  it("keeps an address it can't parse whole rather than guessing", () => {
    expect(parseShowroomAddress("Thamel")).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Thamel",
      addressCountry: "NP",
    });
  });
});

describe("structured data", () => {
  it("builds sameAs from footer URLs and contact handles, without WhatsApp or duplicates", () => {
    const urls = socialProfileUrls(
      [
        { key: "instagram", label: "Instagram", href: "https://instagram.com/shamankathmandu/" },
        { key: "whatsapp", label: "WhatsApp", href: "https://wa.me/9779820151135" },
        { key: "facebook", label: "Facebook", href: "" },
      ],
      { instagram: "@shamankathmandu", tiktok: "@shamankathmandu", whatsapp: "+977 982-015-1135" },
    );
    expect(urls).toEqual([
      "https://instagram.com/shamankathmandu/",
      "https://www.tiktok.com/@shamankathmandu",
    ]);
  });

  it("links each showroom to the organisation and formats its phone", () => {
    const s = showroomJsonLd({
      key: "thamel",
      name: "Thamel",
      address: "Mandala Street, Thamel, Kathmandu 44600",
      whatsapp: "9779820151135",
      mapEmbedUrl: "",
    });
    expect(s["@type"]).toBe("Store");
    expect(s.telephone).toBe("+9779820151135");
    expect(s.parentOrganization).toEqual({ "@id": ORGANIZATION_ID });
    expect(s.address).toMatchObject({ addressLocality: "Kathmandu", postalCode: "44600" });
  });

  it("omits organisation fields the CMS hasn't set", () => {
    const org = organizationJsonLd({ contact: { email: "", phone: "", socials: {} }, sameAs: [] });
    expect(org.email).toBeUndefined();
    expect(org.telephone).toBeUndefined();
    expect(org.sameAs).toBeUndefined();
    expect(org.logo).toBe(`${siteUrl}/icon.png`);
  });

  it("prices a service offer in whole NPR", () => {
    const svc = serviceJsonLd(
      { name: "Tibetan Bowl Therapy", summary: "A one-hour sound bath.", pricePerSession: 2500, hero: null },
      `${siteUrl}/energy/tibetan-bowl-therapy`,
    );
    expect(svc.offers).toMatchObject({ price: 2500, priceCurrency: "NPR" });
    expect(svc.provider).toEqual({ "@id": ORGANIZATION_ID });
  });
});
