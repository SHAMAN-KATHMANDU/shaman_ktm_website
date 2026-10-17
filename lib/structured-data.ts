// schema.org builders shared by the storefront pages. Everything here is
// derived from CMS data the page already renders — no invented opening hours,
// ratings or coordinates, since Google penalises structured data that doesn't
// match what the visitor sees.

import type { Service, Showroom } from "@/lib/api/types";
import type { SiteContact, SocialLink } from "@/lib/site-content";
import { absoluteUrl } from "@/lib/image";
import { SITE_NAME, metaDescription, siteUrl } from "@/lib/seo";

const CONTEXT = "https://schema.org";

/** Stable node ids so pages can reference the business instead of repeating it. */
export const ORGANIZATION_ID = `${siteUrl}/#organization`;
export const WEBSITE_ID = `${siteUrl}/#website`;

const ORG_DESCRIPTION =
  "Handicraft and wellness store in Kathmandu, Nepal: Tibetan singing bowls, crystal jewellery, statues, wood carvings and home décor, plus sound healing sessions.";

// What the business sells and offers, mirroring the live category and service
// lists. Read by search engines as topical signals for the organisation.
const KNOWS_ABOUT = [
  "Nepali handicrafts",
  "Tibetan singing bowls",
  "Sound healing",
  "Crystal jewellery",
  "Hand-carved statues",
  "Wood carving",
  "Dreamcatchers",
  "Home décor",
];

// Profile URL for a bare social handle ("@shamankathmandu").
const SOCIAL_PROFILE: Record<string, (handle: string) => string> = {
  instagram: (h) => `https://www.instagram.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
};

/**
 * Public profile URLs for `sameAs`: the footer's social links plus any
 * handles in the site contact block. WhatsApp links are excluded — they're a
 * chat entry point, not a profile of the business.
 */
export function socialProfileUrls(
  footerSocials: SocialLink[],
  handles: Record<string, string> = {},
): string[] {
  const urls = footerSocials
    .map((s) => s.href.trim())
    .filter((href) => /^https?:\/\//.test(href) && !/wa\.me|whatsapp/i.test(href));
  for (const [key, raw] of Object.entries(handles)) {
    const toUrl = SOCIAL_PROFILE[key];
    const value = raw.trim();
    if (!toUrl || !value) continue;
    urls.push(/^https?:\/\//.test(value) ? value : toUrl(value.replace(/^@/, "")));
  }
  // Dedupe on a normalised form (trailing slash / www differences).
  const seen = new Set<string>();
  return urls.filter((u) => {
    const key = u.toLowerCase().replace(/\/+$/, "").replace("://www.", "://");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function e164(phone: string | undefined): string | undefined {
  const digits = phone?.replace(/\D/g, "");
  return digits ? `+${digits}` : undefined;
}

export function organizationJsonLd(opts: {
  contact?: SiteContact | null;
  sameAs: string[];
  logoUrl?: string | null;
}) {
  const logo = absoluteUrl(opts.logoUrl) ?? `${siteUrl}/icon.png`;
  return {
    "@context": CONTEXT,
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: `${siteUrl}/`,
    logo,
    image: logo,
    description: ORG_DESCRIPTION,
    email: opts.contact?.email || undefined,
    telephone: e164(opts.contact?.phone),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Kathmandu",
      addressCountry: "NP",
    },
    areaServed: { "@type": "Country", name: "Nepal" },
    knowsAbout: KNOWS_ABOUT,
    sameAs: opts.sameAs.length ? opts.sameAs : undefined,
  };
}

export function websiteJsonLd() {
  return {
    "@context": CONTEXT,
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: `${siteUrl}/`,
    inLanguage: ["en", "ne"],
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/**
 * Split a showroom address like "Mandala Street, Thamel, Kathmandu 44600"
 * into PostalAddress parts. The last comma segment carries the city and
 * postcode; anything that doesn't fit that shape stays in streetAddress.
 */
export function parseShowroomAddress(address: string) {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const last = parts.at(-1) ?? "";
  const m = /^(.*?)\s*(\d{5})$/.exec(last);
  if (parts.length < 2 || !m) {
    return { "@type": "PostalAddress", streetAddress: address, addressCountry: "NP" };
  }
  return {
    "@type": "PostalAddress",
    streetAddress: parts.slice(0, -1).join(", "),
    addressLocality: m[1] || undefined,
    postalCode: m[2],
    addressCountry: "NP",
  };
}

export function showroomJsonLd(s: Showroom, imageUrl?: string | null) {
  const image = absoluteUrl(imageUrl) ?? `${siteUrl}/icon.png`;
  return {
    "@context": CONTEXT,
    "@type": "Store",
    "@id": `${siteUrl}/contact#${s.key}`,
    name: `${SITE_NAME} — ${s.name}`,
    image,
    url: `${siteUrl}/contact`,
    telephone: e164(s.whatsapp),
    address: parseShowroomAddress(s.address),
    parentOrganization: { "@id": ORGANIZATION_ID },
  };
}

export function serviceJsonLd(
  service: Pick<Service, "name" | "summary" | "pricePerSession"> & {
    hero: string | null;
  },
  url: string,
  currency = "NPR",
) {
  return {
    "@context": CONTEXT,
    "@type": "Service",
    name: service.name,
    description: metaDescription(service.summary, 500),
    image: absoluteUrl(service.hero) ?? undefined,
    url,
    provider: { "@id": ORGANIZATION_ID },
    areaServed: { "@type": "City", name: "Kathmandu" },
    offers: {
      "@type": "Offer",
      price: service.pricePerSession,
      priceCurrency: currency,
      url,
    },
  };
}

/** An ItemList of product URLs for a category / collection page. */
export function productListJsonLd(
  name: string,
  url: string,
  products: { slug: string; name: string }[],
) {
  return {
    "@context": CONTEXT,
    "@type": "CollectionPage",
    name,
    url,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: products.length,
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl}/products/${p.slug}`,
        name: p.name,
      })),
    },
  };
}
