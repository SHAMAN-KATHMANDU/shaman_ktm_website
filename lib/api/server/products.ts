// Public product reads. Storefront pages call these in-process (via
// lib/api/live); the /api/public/v1 routes are thin HTTP wrappers over them.
// Not-found is `null` so the route can 404 and the live layer can throw.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { productDetailFromRow, productSummaryFromRow } from "./dto";
import { ONLINE_STOCK_LEVEL_SELECT } from "@/lib/stock/constants";
import type {
  ListProductsParams,
  ProductDetail,
  ProductListResponse,
  ProductSummary,
  ReviewListResponse,
} from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

const SUMMARY_INCLUDE = {
  variations: { include: { stockLevels: ONLINE_STOCK_LEVEL_SELECT } },
} as const;

// Same paging rules the routes always applied to query strings.
const int = (v: number | undefined, fallback: number) =>
  v !== undefined && Number.isFinite(v) ? Math.trunc(v) : fallback;

const findPublished = (idOrSlug: string) => ({
  status: "published",
  OR: [{ id: idOrSlug }, { slug: idOrSlug }],
});

export async function listProducts(
  params: ListProductsParams & { featured?: boolean } = {},
  locale: Locale = "en",
): Promise<ProductListResponse> {
  const page = Math.max(1, int(params.page, 1));
  const limit = Math.min(100, Math.max(1, int(params.limit, 24)));
  const where: Prisma.ProductWhereInput = { status: "published" };
  if (params.categoryId) where.categoryId = params.categoryId;
  else if (params.categorySlug) where.category = { slug: params.categorySlug };
  if (params.elementSlug) where.elementSlugs = { has: params.elementSlug };
  if (params.featured) where.isFeatured = true;
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { tags: { has: params.search } },
    ];
  }
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.price = { gte: params.minPrice, lte: params.maxPrice };
  }
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    params.sort === "price_asc"
      ? { price: "asc" }
      : params.sort === "price_desc"
        ? { price: "desc" }
        : { createdAt: "desc" };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: SUMMARY_INCLUDE,
    }),
    prisma.product.count({ where }),
  ]);
  return {
    products: rows.map((r) => productSummaryFromRow(r, locale)),
    total,
    page,
    limit,
    facets: null,
  };
}

export async function getProduct(
  idOrSlug: string,
  locale: Locale = "en",
): Promise<ProductDetail | null> {
  const row = await prisma.product.findFirst({
    where: findPublished(idOrSlug),
    include: {
      variations: {
        // Whitelisted to what the storefront gallery renders. `altNe` comes
        // along so the DTO can resolve alt text to the request locale; the
        // pair never reaches the client.
        include: {
          stockLevels: ONLINE_STOCK_LEVEL_SELECT,
          images: {
            orderBy: { position: "asc" },
            select: { url: true, alt: true, altNe: true },
          },
        },
      },
      images: { orderBy: { position: "asc" } },
      category: true,
    },
  });
  return row ? productDetailFromRow(row, locale) : null;
}

export async function getProductReviews(
  idOrSlug: string,
  params: { page?: number; limit?: number } = {},
): Promise<ReviewListResponse | null> {
  const page = Math.max(1, int(params.page, 1));
  const limit = Math.min(50, Math.max(1, int(params.limit, 10)));
  const product = await prisma.product.findFirst({
    where: findPublished(idOrSlug),
    select: { id: true },
  });
  if (!product) return null;
  // Only approved reviews are public — pending submissions sit in the admin
  // moderation queue at /sysuser/reviews.
  const where = { productId: product.id, isApproved: true };
  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
  ]);
  return {
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      authorName: r.authorName,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    limit,
  };
}

/** Up to 4 other published products from the same category, newest first. */
export async function getRelatedProducts(
  idOrSlug: string,
  locale: Locale = "en",
): Promise<ProductSummary[] | null> {
  const product = await prisma.product.findFirst({
    where: findPublished(idOrSlug),
    select: { id: true, categoryId: true },
  });
  if (!product) return null;
  const rows = await prisma.product.findMany({
    where: {
      id: { not: product.id },
      categoryId: product.categoryId,
      status: "published",
    },
    take: 4,
    orderBy: { createdAt: "desc" },
    include: SUMMARY_INCLUDE,
  });
  return rows.map((r) => productSummaryFromRow(r, locale));
}
