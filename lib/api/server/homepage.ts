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
} from "@/lib/api/server/dto";
import type {
  ProductSummary,
  BlogPostSummary,
  Service,
} from "@/lib/api/types";

interface HomepageConfigData {
  heroImage?: string | null;
  heroVideoEmbedUrl?: string | null;
  newReleasesProductIds?: string[];
  featuredPostIds?: string[];
  elementSpotlightProductIds?: Record<string, string[]>;
  servicesPreviewSlugs?: string[];
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
        .map(productSummaryFromRow);
    }

    // Fallback: newest published products (up to fallbackLimit). Prioritises
    // anything flagged isNewRelease, then orders by createdAt desc.
    const rows = await prisma.product.findMany({
      where: { status: "published" },
      orderBy: [{ isNewRelease: "desc" }, { createdAt: "desc" }],
      take: fallbackLimit,
      include: { variations: true },
    });
    return rows.map(productSummaryFromRow);
  } catch {
    return [];
  }
}

export async function getCuratedFeaturedPosts(
  fallbackLimit = 4,
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
        .map(blogPostSummaryFromRow);
    }

    const rows = await prisma.blogPost.findMany({
      where: { status: "published" },
      orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }],
      take: fallbackLimit,
      include: { category: true },
    });
    return rows.map(blogPostSummaryFromRow);
  } catch {
    return [];
  }
}

export async function getCuratedElementSpotlight(
  element: string,
  fallbackLimit = 0,
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
        .map(productSummaryFromRow);
    }

    if (fallbackLimit <= 0) return [];

    const rows = await prisma.product.findMany({
      where: { status: "published", elementSlugs: { has: element } },
      orderBy: [{ isNewRelease: "desc" }, { createdAt: "desc" }],
      take: fallbackLimit,
      include: { variations: true },
    });
    return rows.map(productSummaryFromRow);
  } catch {
    return [];
  }
}

export async function getCuratedServicesPreview(
  fallbackLimit = 3,
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
        .map(serviceFromRow);
    }

    const rows = await prisma.service.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      take: fallbackLimit,
    });
    return rows.map(serviceFromRow);
  } catch {
    return [];
  }
}
