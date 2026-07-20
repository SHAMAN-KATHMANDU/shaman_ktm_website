// Server-only resolvers that turn HomepageConfig (the curator's picks set in
// /sysuser/homepage) into actual rows. Each helper falls back to a sensible
// default when the curator hasn't picked anything yet — so a fresh deploy
// still renders a populated home page.
//
// Every prisma call is wrapped in try/catch so the home page can be
// statically prerendered during `next build` (which runs without a
// DATABASE_URL). At runtime the DB is reachable and these return real data.

import { prisma } from "@/lib/db";
import {
  productSummaryFromRow,
  blogPostSummaryFromRow,
  serviceFromRow,
  resolveI18nField,
} from "@/lib/api/server/dto";
import type {
  ProductSummary,
  BlogPostSummary,
  Service,
} from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

interface OfferCardData {
  type: "collection" | "text";
  collectionSlug?: string | null;
  chipLabel?: string | null;
  chipLabelNe?: string | null;
  heading: string;
  headingNe?: string | null;
  blurb: string;
  blurbNe?: string | null;
  ctaLabel: string;
  ctaLabelNe?: string | null;
  ctaHref: string;
  imageUrl?: string | null;
}

interface CampaignRailData {
  collectionSlug: string;
  badgeLabel: string;
  badgeLabelNe?: string | null;
  memberDiscountPercent?: number;
}

interface ClearanceData {
  collectionSlug: string;
  percentLabel: string;
  badgeLabel: string;
  badgeLabelNe?: string | null;
}

interface HomepageConfigData {
  heroImage?: string | null;
  heroVideoEmbedUrl?: string | null;
  newReleasesProductIds?: string[];
  featuredPostIds?: string[];
  elementSpotlightProductIds?: Record<string, string[]>;
  servicesPreviewSlugs?: string[];
  offersCards?: OfferCardData[];
  campaignRail?: CampaignRailData | null;
  clearance?: ClearanceData | null;
}

async function loadConfig(): Promise<HomepageConfigData> {
  try {
    const row = await prisma.homepageConfig.findUnique({ where: { id: 1 } });
    return (row?.data as HomepageConfigData) ?? {};
  } catch {
    return {};
  }
}

export async function getHomepageConfig(): Promise<HomepageConfigData> {
  return loadConfig();
}

export async function getCuratedNewReleases(
  fallbackLimit = 8,
  locale: Locale = "en",
): Promise<ProductSummary[]> {
  const cfg = await loadConfig();
  const ids = cfg.newReleasesProductIds ?? [];

  try {
    if (ids.length > 0) {
      const rows = await prisma.product.findMany({
        where: { id: { in: ids }, status: "published" },
        include: { variations: true },
      });
      // Preserve curator-defined order.
      return ids
        .map((id) => rows.find((r) => r.id === id))
        .filter((r): r is (typeof rows)[number] => !!r)
        .map((r) => productSummaryFromRow(r, locale));
    }

    // Fallback: newest published products (up to fallbackLimit). Prioritises
    // anything flagged isNewRelease, then orders by createdAt desc.
    const rows = await prisma.product.findMany({
      where: { status: "published" },
      orderBy: [{ isNewRelease: "desc" }, { createdAt: "desc" }],
      take: fallbackLimit,
      include: { variations: true },
    });
    return rows.map((r) => productSummaryFromRow(r, locale));
  } catch {
    return [];
  }
}

export interface CategoryPreview {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  productCount: number;
  /** Thumbnails of the 4 most recently published products in the category. */
  productImages: string[];
}

export async function getCategoriesWithLatestProducts(
  limit = 50,
  locale: Locale = "en",
): Promise<CategoryPreview[]> {
  try {
    const rows = await prisma.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      take: limit,
      include: {
        _count: {
          select: { products: { where: { status: "published" } } },
        },
        products: {
          where: { status: "published" },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { thumbnailUrl: true },
        },
      },
    });
    // Show every category — even ones without published products yet.
    return rows.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: resolveI18nField(c as Record<string, unknown>, "name", locale),
      imageUrl: c.imageUrl,
      productCount: c._count.products,
      productImages: c.products
        .map((p) => p.thumbnailUrl)
        .filter((u): u is string => !!u),
    }));
  } catch {
    return [];
  }
}

export async function getFeaturedProducts(
  limit = 8,
  locale: Locale = "en",
): Promise<ProductSummary[]> {
  try {
    const rows = await prisma.product.findMany({
      where: { status: "published", isFeatured: true },
      orderBy: [{ updatedAt: "desc" }],
      take: limit,
      include: { variations: true },
    });
    return rows.map((r) => productSummaryFromRow(r, locale));
  } catch {
    return [];
  }
}

export async function getCuratedFeaturedPosts(
  fallbackLimit = 4,
  locale: Locale = "en",
): Promise<BlogPostSummary[]> {
  const cfg = await loadConfig();
  const ids = cfg.featuredPostIds ?? [];

  try {
    if (ids.length > 0) {
      const rows = await prisma.blogPost.findMany({
        where: { id: { in: ids }, status: "published" },
        include: { category: true },
      });
      return ids
        .map((id) => rows.find((r) => r.id === id))
        .filter((r): r is (typeof rows)[number] => !!r)
        .map((r) => blogPostSummaryFromRow(r, locale));
    }

    const rows = await prisma.blogPost.findMany({
      where: { status: "published" },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      take: fallbackLimit,
      include: { category: true },
    });
    return rows.map((r) => blogPostSummaryFromRow(r, locale));
  } catch {
    return [];
  }
}

export async function getCuratedElementSpotlight(
  element: string,
  fallbackLimit = 0,
  locale: Locale = "en",
): Promise<ProductSummary[]> {
  const cfg = await loadConfig();
  const ids = cfg.elementSpotlightProductIds?.[element] ?? [];

  try {
    if (ids.length > 0) {
      const rows = await prisma.product.findMany({
        where: { id: { in: ids }, status: "published" },
        include: { variations: true },
      });
      return ids
        .map((id) => rows.find((r) => r.id === id))
        .filter((r): r is (typeof rows)[number] => !!r)
        .map((r) => productSummaryFromRow(r, locale));
    }

    if (fallbackLimit <= 0) return [];

    const rows = await prisma.product.findMany({
      where: { status: "published", elementSlugs: { has: element } },
      orderBy: [{ isNewRelease: "desc" }, { createdAt: "desc" }],
      take: fallbackLimit,
      include: { variations: true },
    });
    return rows.map((r) => productSummaryFromRow(r, locale));
  } catch {
    return [];
  }
}

export async function getCuratedServicesPreview(
  fallbackLimit = 3,
  locale: Locale = "en",
): Promise<Service[]> {
  const cfg = await loadConfig();
  const slugs = cfg.servicesPreviewSlugs ?? [];

  try {
    if (slugs.length > 0) {
      const rows = await prisma.service.findMany({
        where: { slug: { in: slugs } },
      });
      return slugs
        .map((s) => rows.find((r) => r.slug === s))
        .filter((r): r is (typeof rows)[number] => !!r)
        .map((r) => serviceFromRow(r, locale));
    }

    const rows = await prisma.service.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      take: fallbackLimit,
    });
    return rows.map((r) => serviceFromRow(r, locale));
  } catch {
    return [];
  }
}

// ─── New-homepage sections (offers grid, campaign rail, clearance, showrooms) ─

export interface ResolvedOfferCard {
  type: "collection" | "text";
  collectionSlug: string | null;
  chipLabel: string | null;
  heading: string;
  blurb: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string | null;
}

/**
 * Offers-grid cards with locale resolved and images filled from the linked
 * collection (explicit imageUrl override → collection hero → first product
 * thumbnail). Text cards keep a null image and render as pure copy.
 */
export async function getOffersCards(
  locale: Locale = "en",
): Promise<ResolvedOfferCard[]> {
  const cfg = await loadConfig();
  const cards = cfg.offersCards ?? [];
  if (cards.length === 0) return [];

  const slugs = cards
    .filter((c) => c.type === "collection" && c.collectionSlug)
    .map((c) => c.collectionSlug as string);

  let collections: {
    slug: string;
    heroImageUrl: string | null;
    thumb: string | null;
  }[] = [];
  try {
    if (slugs.length > 0) {
      const rows = await prisma.collection.findMany({
        where: { slug: { in: slugs } },
        include: {
          products: {
            orderBy: { position: "asc" },
            take: 1,
            include: { product: { select: { thumbnailUrl: true } } },
          },
        },
      });
      collections = rows.map((r) => ({
        slug: r.slug,
        heroImageUrl: r.heroImageUrl,
        thumb: r.products[0]?.product.thumbnailUrl ?? null,
      }));
    }
  } catch {
    collections = [];
  }

  return cards.map((c) => {
    const coll = collections.find((x) => x.slug === c.collectionSlug);
    const record = c as unknown as Record<string, unknown>;
    return {
      type: c.type,
      collectionSlug: c.collectionSlug ?? null,
      chipLabel: c.chipLabel
        ? resolveI18nField(record, "chipLabel", locale)
        : null,
      heading: resolveI18nField(record, "heading", locale),
      blurb: resolveI18nField(record, "blurb", locale),
      ctaLabel: resolveI18nField(record, "ctaLabel", locale),
      ctaHref: c.ctaHref,
      imageUrl:
        c.imageUrl || coll?.heroImageUrl || coll?.thumb || null,
    };
  });
}

export interface ResolvedCampaignRail {
  collectionSlug: string;
  badgeLabel: string;
  memberDiscountPercent: number;
  products: ProductSummary[];
}

async function publishedCollectionProducts(
  slug: string,
  locale: Locale,
): Promise<ProductSummary[]> {
  const coll = await prisma.collection.findUnique({
    where: { slug },
    include: {
      products: {
        orderBy: { position: "asc" },
        include: { product: { include: { variations: true } } },
      },
    },
  });
  if (!coll) return [];
  return coll.products
    .map((cp) => cp.product)
    .filter((p) => p.status === "published")
    .map((p) => productSummaryFromRow(p, locale));
}

export async function getCampaignRail(
  locale: Locale = "en",
): Promise<ResolvedCampaignRail | null> {
  const cfg = await loadConfig();
  const rail = cfg.campaignRail;
  if (!rail?.collectionSlug) return null;
  try {
    const products = await publishedCollectionProducts(
      rail.collectionSlug,
      locale,
    );
    if (products.length === 0) return null;
    return {
      collectionSlug: rail.collectionSlug,
      badgeLabel: resolveI18nField(
        rail as unknown as Record<string, unknown>,
        "badgeLabel",
        locale,
      ),
      memberDiscountPercent: rail.memberDiscountPercent ?? 0,
      products,
    };
  } catch {
    return null;
  }
}

export interface ResolvedClearance {
  collectionSlug: string;
  percentLabel: string;
  badgeLabel: string;
  products: ProductSummary[];
}

export async function getClearanceSection(
  locale: Locale = "en",
): Promise<ResolvedClearance | null> {
  const cfg = await loadConfig();
  const clearance = cfg.clearance;
  if (!clearance?.collectionSlug) return null;
  try {
    const products = await publishedCollectionProducts(
      clearance.collectionSlug,
      locale,
    );
    if (products.length === 0) return null;
    return {
      collectionSlug: clearance.collectionSlug,
      percentLabel: clearance.percentLabel,
      badgeLabel: resolveI18nField(
        clearance as unknown as Record<string, unknown>,
        "badgeLabel",
        locale,
      ),
      products,
    };
  } catch {
    return null;
  }
}
