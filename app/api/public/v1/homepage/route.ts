export const dynamic = "force-dynamic";

// Resolves the curated HomepageConfig (a single Json blob set in /sysuser/homepage)
// into actual products + posts so the frontend can render directly.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  blogPostSummaryFromRow,
  productSummaryFromRow,
} from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { localeFromRequest } from "@/lib/i18n/locale";

export const revalidate = 60;

interface HomepageConfigData {
  heroImage?: string | null;
  heroVideoEmbedUrl?: string | null;
  newReleasesProductIds?: string[];
  featuredPostIds?: string[];
  elementSpotlightProductIds?: Record<string, string[]>;
  servicesPreviewSlugs?: string[];
}

export async function GET(req: Request) {
  const locale = localeFromRequest(req);
  const row = await prisma.homepageConfig.findUnique({ where: { id: 1 } });
  const cfg: HomepageConfigData = (row?.data as HomepageConfigData) ?? {};

  const newReleaseIds = cfg.newReleasesProductIds ?? [];
  const featuredPostIds = cfg.featuredPostIds ?? [];

  const [products, posts] = await Promise.all([
    newReleaseIds.length
      ? prisma.product.findMany({
          where: { id: { in: newReleaseIds }, status: "published" },
          include: { variations: true },
        })
      : Promise.resolve([]),
    featuredPostIds.length
      ? prisma.blogPost.findMany({
          where: { id: { in: featuredPostIds }, status: "published" },
          include: { category: true },
        })
      : Promise.resolve([]),
  ]);

  // Preserve curator-defined order.
  const orderedProducts = newReleaseIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is (typeof products)[number] => !!p)
    .map((r) => productSummaryFromRow(r, locale));
  const orderedPosts = featuredPostIds
    .map((id) => posts.find((p) => p.id === id))
    .filter((p): p is (typeof posts)[number] => !!p)
    .map((r) => blogPostSummaryFromRow(r, locale));

  return NextResponse.json(
    {
      message: "ok",
      homepage: {
        heroImage: cfg.heroImage ?? null,
        heroVideoEmbedUrl: cfg.heroVideoEmbedUrl ?? null,
        newReleases: orderedProducts,
        featuredPosts: orderedPosts,
        elementSpotlightProductIds: cfg.elementSpotlightProductIds ?? {},
        servicesPreviewSlugs: cfg.servicesPreviewSlugs ?? [],
      },
    },
    {
      headers: {
        "Cache-Tag": [
          CACHE_TAGS.homepage,
          CACHE_TAGS.products,
          CACHE_TAGS.blog,
        ].join(","),
      },
    },
  );
}
