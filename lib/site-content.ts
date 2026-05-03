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
