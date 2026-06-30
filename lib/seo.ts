// Helpers that build a Next Metadata object from CMS-stored SEO fields.
// Used by every dynamic detail page so canonical / OG / noindex / twitter-card
// behaviour is consistent across products, posts, services, bundles, etc.

import type { Metadata } from "next";
import { stripLocale, localizeHref } from "@/lib/i18n/locale";

const SITE_URL = (
  process.env.NEXT_PUBLIC_PROJECTX_ORIGIN ?? "https://shamankathmandu.com"
).replace(/\/+$/, "");

export interface SeoSource {
  seoTitle?: string | null;
  seoDescription?: string | null;
  ogImageUrl?: string | null;
  canonicalUrl?: string | null;
  noindex?: boolean | null;
  twitterCard?: string | null;
  fallbackTitle: string;
  fallbackDescription?: string | null;
  fallbackImage?: string | null;
  /** Path including leading slash, e.g. "/products/foo" */
  path: string;
  /** "website" | "article" | "product" — defaults to "website". */
  ogType?: "website" | "article";
}

export function buildMetadata(s: SeoSource): Metadata {
  const title = s.seoTitle?.trim() || s.fallbackTitle;
  const description =
    s.seoDescription?.trim() || s.fallbackDescription || undefined;
  const canonical = s.canonicalUrl?.trim() || `${SITE_URL}${s.path}`;
  const ogImage = s.ogImageUrl?.trim() || s.fallbackImage || undefined;
  const card =
    (s.twitterCard as "summary" | "summary_large_image" | null) ||
    "summary_large_image";

  // hreflang alternates: English at the bare path, Nepali under /ne.
  const barePath = stripLocale(s.path);
  const languages = {
    en: `${SITE_URL}${barePath}`,
    ne: `${SITE_URL}${localizeHref(barePath, "ne")}`,
    "x-default": `${SITE_URL}${barePath}`,
  };

  return {
    title,
    description,
    alternates: { canonical, languages },
    robots: s.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      type: s.ogType ?? "website",
      url: canonical,
      images: ogImage ? [ogImage] : undefined,
    },
    twitter: {
      card,
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export const siteUrl = SITE_URL;
