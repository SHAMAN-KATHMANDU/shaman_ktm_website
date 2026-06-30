export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { productSummaryFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { localeFromRequest } from "@/lib/i18n/locale";

export const revalidate = 60;

const PRODUCT_INCLUDE = {
  variations: true,
} as const;

function intParam(v: string | null, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  // tag binding: route reads tagged data
  void CACHE_TAGS;

  const locale = localeFromRequest(req);
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, intParam(searchParams.get("page"), 1));
  const limit = Math.min(100, Math.max(1, intParam(searchParams.get("limit"), 24)));
  const categoryId = searchParams.get("categoryId") || undefined;
  const elementSlug = searchParams.get("elementSlug") || undefined;
  const search = searchParams.get("search") || undefined;
  const sort = (searchParams.get("sort") || "newest") as
    | "newest"
    | "price_asc"
    | "price_desc"
    | "relevance";
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const featured = searchParams.get("featured");

  const where: Prisma.ProductWhereInput = {
    status: "published",
  };
  if (categoryId) where.categoryId = categoryId;
  if (elementSlug) where.elementSlugs = { has: elementSlug };
  if (featured === "1" || featured === "true") where.isFeatured = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { tags: { has: search } },
    ];
  }
  if (minPrice) where.price = { ...(where.price as object), gte: parseInt(minPrice, 10) };
  if (maxPrice) where.price = { ...(where.price as object), lte: parseInt(maxPrice, 10) };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { price: "asc" }
      : sort === "price_desc"
        ? { price: "desc" }
        : { createdAt: "desc" };

  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: PRODUCT_INCLUDE,
    }),
    prisma.product.count({ where }),
  ]);

  const products = rows.map((r) => productSummaryFromRow(r, locale));

  return NextResponse.json(
    {
      message: "ok",
      products,
      total,
      page,
      limit,
      facets: null,
    },
    {
      headers: { "Cache-Tag": CACHE_TAGS.products },
    },
  );
}
