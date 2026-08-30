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
import { ONLINE_STOCK_LEVEL_SELECT } from "@/lib/stock/constants";

export const revalidate = 60;

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

// Published products of a collection, in curator (junction position) order.
async function collectionProducts(slug: string | undefined | null) {
  if (!slug) return [];
  const coll = await prisma.collection.findUnique({
    where: { slug },
    include: {
      products: {
        orderBy: { position: "asc" },
        include: {
          product: {
            include: {
              variations: {
                include: { stockLevels: ONLINE_STOCK_LEVEL_SELECT },
              },
            },
          },
        },
      },
    },
  });
  if (!coll) return [];
  return coll.products
    .map((cp) => cp.product)
    .filter((p) => p.status === "published");
}

export async function GET(req: Request) {
  const locale = localeFromRequest(req);
  const row = await prisma.homepageConfig.findUnique({ where: { id: 1 } });
  const cfg: HomepageConfigData = (row?.data as HomepageConfigData) ?? {};

  const newReleaseIds = cfg.newReleasesProductIds ?? [];
  const featuredPostIds = cfg.featuredPostIds ?? [];

  const [products, posts, campaignRows, clearanceRows] = await Promise.all([
    newReleaseIds.length
      ? prisma.product.findMany({
          where: { id: { in: newReleaseIds }, status: "published" },
          include: {
            variations: {
              include: { stockLevels: ONLINE_STOCK_LEVEL_SELECT },
            },
          },
        })
      : Promise.resolve([]),
    featuredPostIds.length
      ? prisma.blogPost.findMany({
          where: { id: { in: featuredPostIds }, status: "published" },
          include: { category: true },
        })
      : Promise.resolve([]),
    collectionProducts(cfg.campaignRail?.collectionSlug),
    collectionProducts(cfg.clearance?.collectionSlug),
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
        offersCards: cfg.offersCards ?? [],
        campaign: cfg.campaignRail
          ? {
              ...cfg.campaignRail,
              memberDiscountPercent:
                cfg.campaignRail.memberDiscountPercent ?? 0,
              products: campaignRows.map((r) =>
                productSummaryFromRow(r, locale),
              ),
            }
          : null,
        clearance: cfg.clearance
          ? {
              ...cfg.clearance,
              products: clearanceRows.map((r) =>
                productSummaryFromRow(r, locale),
              ),
            }
          : null,
      },
    },
    {
      headers: {
        "Cache-Tag": [
          CACHE_TAGS.homepage,
          CACHE_TAGS.products,
          CACHE_TAGS.blog,
          CACHE_TAGS.collections,
        ].join(","),
      },
    },
  );
}
