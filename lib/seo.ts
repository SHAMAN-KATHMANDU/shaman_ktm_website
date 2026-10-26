// Helpers that build a Next Metadata object from CMS-stored SEO fields.
// Used by every dynamic detail page so canonical / OG / noindex / twitter-card
// behaviour is consistent across products, posts, services, bundles, etc.

import type { Metadata } from "next";
import {
  stripLocale,
  splitLocale,
  localizeHref,
  type Locale,
} from "@/lib/i18n/locale";
import type { SeoCopy } from "@/lib/i18n/types";
import { siteUrl as SITE_URL } from "@/lib/site-url";
import { absoluteUrl } from "@/lib/image";

/** Brand image (singing bowl + mark) used when a page has no image of its own. */
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-default.jpg`;

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
  /** "website" | "article" — defaults to "website". Ignored when `isProduct`. */
  ogType?: "website" | "article";
  /**
   * Product detail pages set this so we DON'T emit og:type=website. The page
   * itself renders the `og:type=product` + `product:*` microdata as real
   * property-based <meta> tags (Facebook only reads `property=`, not the
   * `name=` tags Next's Metadata `other` map produces).
   */
  isProduct?: boolean;
}

export function buildMetadata(s: SeoSource): Metadata {
  const title = s.seoTitle?.trim() || s.fallbackTitle;
  const description =
    s.seoDescription?.trim() || s.fallbackDescription || undefined;
  const canonical = s.canonicalUrl?.trim() || `${SITE_URL}${s.path}`;
  // Meta requires absolute https image URLs; stored thumbnails may be relative.
  // A page's openGraph replaces the layout's wholesale, so the brand default
  // must be applied here or most shared links would preview with no image.
  const ogImage =
    absoluteUrl(s.ogImageUrl?.trim() || s.fallbackImage || null) ||
    DEFAULT_OG_IMAGE;
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
      siteName: SITE_NAME,
      locale: splitLocale(s.path).locale === "ne" ? "ne_NP" : "en_US",
      // Product pages render their own og:type=product <meta>; suppress the
      // default here so there's no conflicting og:type=website.
      ...(s.isProduct ? {} : { type: s.ogType ?? "website" }),
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

/**
 * Metadata for a static listing page from its dictionary copy (`t.seo.*`).
 * `path` is the bare English path; the locale prefix is added here so the
 * canonical points at the page actually being served (/ne/... for Nepali).
 */
export function pageMetadata(
  copy: { title: string; description?: string },
  path: string,
  locale: Locale,
  opts: { noindex?: boolean; image?: string | null } = {},
): Metadata {
  return buildMetadata({
    fallbackTitle: copy.title,
    fallbackDescription: copy.description,
    fallbackImage: opts.image,
    noindex: opts.noindex,
    path: localizeHref(path, locale),
  });
}

/**
 * A meta description from free text: markdown/whitespace flattened and cut at
 * a word boundary near 160 chars, so search results don't end mid-word.
 */
export function metaDescription(text: string | null | undefined, max = 160): string {
  const flat = (text ?? "")
    // [label](url) → label, so a link never leaves a raw URL in the snippet.
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_>`[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:—-]+$/, "")}…`;
}

/** Fill `{name}` placeholders in a dictionary SEO template. */
export function fillSeo(copy: SeoCopy, name: string): SeoCopy {
  return {
    title: copy.title.replaceAll("{name}", name),
    description: copy.description.replaceAll("{name}", name),
  };
}

export const SITE_NAME = "Shaman Kathmandu";
export const siteUrl = SITE_URL;
