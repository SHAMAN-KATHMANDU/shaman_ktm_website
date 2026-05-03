// Server-only accessors for editable site copy and branding extras stored
// inside SiteConfig.data. The frontend reads these so every visible string
// on the home page (hero, brand strip, section headings) is editable from
// /sysuser/site without touching code.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export interface HomeCopy {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  brandStripLines: string[];
  elementsHeading: string;
  elementsSubheading: string;
  newReleasesHeading: string;
  newReleasesSubheading: string;
  featuredStoryEyebrow: string;
  servicesHeading: string;
  servicesSubheading: string;
  footerTagline: string;
  footerCopyright: string;
  newsletterHeading: string;
  newsletterDescription: string;
}

export const DEFAULT_HOME_COPY: HomeCopy = {
  heroEyebrow: "Curated in Kathmandu",
  heroTitle: "Nature + Energy",
  heroSubtitle:
    "Hand-curated objects and services around six elements — Metal, Earth, Wood, Plant, Water, Air.",
  heroCtaLabel: "Explore the elements",
  heroCtaHref: "/nature",
  brandStripLines: [
    "Curated in Kathmandu",
    "From the world",
    "For the world",
  ],
  elementsHeading: "The six elements",
  elementsSubheading: "Everything in nature carries energy.",
  newReleasesHeading: "New releases",
  newReleasesSubheading: "Just arrived this season.",
  featuredStoryEyebrow: "Shaman Stories",
  servicesHeading: "Energy services",
  servicesSubheading: "Sound, breath, and stillness in the showroom.",
  footerTagline: "Nature + Energy. Kathmandu.",
  footerCopyright: "© Shaman Kathmandu. All rights reserved.",
  newsletterHeading: "Stay in touch",
  newsletterDescription:
    "Notes from the showroom, new arrivals, occasional letters.",
};

export interface BrandingExtras {
  logoUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
}

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  heading: string;
  links: NavLink[];
}

export interface SocialLink {
  key: string; // e.g. instagram, facebook, tiktok, whatsapp, youtube
  label: string;
  href: string;
}

export interface NavConfig {
  /** Primary header navigation. */
  headerLinks: NavLink[];
  /** Header right-side action labels. Hide one by setting label to "". */
  headerLoginLabel: string;
  headerLoginHref: string;
  headerSearchHref: string;
  headerWishlistHref: string;
  /** Footer columns (heading + links). */
  footerColumns: FooterColumn[];
  /** Bottom-of-footer legal links. */
  footerLegalLinks: NavLink[];
  /** Quote / paragraph rendered above the legal row. */
  footerQuote: string;
  /** Social icons in the footer. */
  footerSocials: SocialLink[];
  /** Reusable CTA labels that surface on cards / detail pages. */
  ctaProductEnquireLabel: string;
  ctaWhatsappFloatLabel: string;
  ctaNewsletterButtonLabel: string;
}

export const DEFAULT_NAV_CONFIG: NavConfig = {
  headerLinks: [
    { label: "Home", href: "/" },
    { label: "Nature", href: "/nature" },
    { label: "Energy", href: "/energy" },
    { label: "Shaman Stories", href: "/stories" },
  ],
  headerLoginLabel: "Login",
  headerLoginHref: "/account/login",
  headerSearchHref: "/search",
  headerWishlistHref: "/account/dashboard",
  footerColumns: [
    {
      heading: "Explore",
      links: [
        { label: "Nature", href: "/nature" },
        { label: "Energy Services", href: "/energy" },
        { label: "Shaman Stories", href: "/stories" },
        { label: "Bundles", href: "/bundles" },
      ],
    },
    {
      heading: "Support",
      links: [
        { label: "About", href: "/pages/about" },
        { label: "FAQ", href: "/pages/faq" },
        { label: "Contact", href: "mailto:info@shamankathmandu.com", external: true },
      ],
    },
  ],
  footerLegalLinks: [
    { label: "Privacy", href: "/pages/privacy" },
    { label: "Terms", href: "/pages/terms" },
  ],
  footerQuote: "Nature does not carry a passport. Neither do we.",
  footerSocials: [
    { key: "instagram", label: "Instagram", href: "" },
    { key: "tiktok", label: "TikTok", href: "" },
    { key: "facebook", label: "Facebook", href: "" },
    { key: "youtube", label: "YouTube", href: "" },
    { key: "whatsapp", label: "WhatsApp", href: "" },
  ],
  ctaProductEnquireLabel: "Enquire on WhatsApp",
  ctaWhatsappFloatLabel: "Enquire",
  ctaNewsletterButtonLabel: "Subscribe",
};

export const getHomeCopy = unstable_cache(
  async (): Promise<HomeCopy> => {
    try {
      const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
      const stored =
        row?.data && typeof row.data === "object" && "homeCopy" in row.data
          ? ((row.data as { homeCopy?: Partial<HomeCopy> }).homeCopy ?? {})
          : {};
      return { ...DEFAULT_HOME_COPY, ...stored };
    } catch {
      return DEFAULT_HOME_COPY;
    }
  },
  ["site-home-copy"],
  { tags: [CACHE_TAGS.site], revalidate: 60 },
);

export const getNavConfig = unstable_cache(
  async (): Promise<NavConfig> => {
    try {
      const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
      const stored =
        row?.data && typeof row.data === "object" && "nav" in row.data
          ? ((row.data as { nav?: Partial<NavConfig> }).nav ?? {})
          : {};
      // Shallow merge — arrays in `stored` fully replace defaults so editors
      // can drop default links by saving an empty array.
      return { ...DEFAULT_NAV_CONFIG, ...stored } as NavConfig;
    } catch {
      return DEFAULT_NAV_CONFIG;
    }
  },
  ["site-nav-config"],
  { tags: [CACHE_TAGS.site], revalidate: 60 },
);

export const getBrandingExtras = unstable_cache(
  async (): Promise<BrandingExtras> => {
    try {
      const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
      const data = (row?.data ?? {}) as {
        branding?: { logoUrl?: string; faviconUrl?: string };
        seo?: { ogImage?: string };
      };
      return {
        logoUrl: data.branding?.logoUrl ?? "",
        faviconUrl: data.branding?.faviconUrl ?? "/favicon.ico",
        ogImageUrl: data.seo?.ogImage ?? "",
      };
    } catch {
      return { logoUrl: "", faviconUrl: "/favicon.ico", ogImageUrl: "" };
    }
  },
  ["site-branding-extras"],
  { tags: [CACHE_TAGS.site], revalidate: 60 },
);
