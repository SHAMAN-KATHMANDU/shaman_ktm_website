import { apiGet } from "@/lib/api/client";
import type {
  FrequentlyBoughtItem,
  ListProductsParams,
  ProductDetail,
  ProductListResponse,
  ReviewListResponse,
} from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";
import { listCategories } from "./categories";

async function resolveCategorySlugToId(slug: string, locale: Locale = "en"): Promise<string | undefined> {
  const cats = await listCategories(locale);
  return cats.find((c) => c.slug === slug)?.id;
}

export async function listProducts(
  params: ListProductsParams = {},
  locale: Locale = "en",
): Promise<ProductListResponse> {
  const { categorySlug, elementSlug, ...rest } = params;
  let categoryId = rest.categoryId;
  if (!categoryId && categorySlug) {
    categoryId = await resolveCategorySlugToId(categorySlug, locale);
    if (!categoryId && !elementSlug) {
      return {
        products: [],
        total: 0,
        page: rest.page ?? 1,
        limit: rest.limit ?? 24,
        facets: null,
      };
    }
  }

  const res = await apiGet<ProductListResponse & { message: string }>(
    "/products",
    {
      page: rest.page,
      limit: rest.limit,
      categoryId,
      elementSlug,
      search: rest.search,
      sort: rest.sort,
      minPrice: rest.minPrice,
      maxPrice: rest.maxPrice,
      vendorId: rest.vendorId,
      attr: rest.attr,
      includeFacets: rest.includeFacets,
    },
    locale,
  );
  return {
    products: res.products,
    total: res.total,
    page: res.page,
    limit: res.limit,
    facets: res.facets ?? null,
  };
}

export async function getProduct(idOrSlug: string, locale: Locale = "en"): Promise<ProductDetail> {
  // The live API uses :id (uuid). If we got a slug, find it via list.
  // Heuristic: uuids contain hyphens AND no spaces and length ~36; slugs are
  // also hyphenated, so we attempt direct first and fall back to a search.
  try {
    const res = await apiGet<{ message: string; product: ProductDetail }>(
      `/products/${encodeURIComponent(idOrSlug)}`,
      undefined,
      locale,
    );
    return res.product;
  } catch {
    const list = await listProducts({ search: idOrSlug, limit: 5 }, locale);
    const match = list.products.find((p) => p.slug === idOrSlug);
    if (!match) throw new Error(`Product not found: ${idOrSlug}`);
    const res = await apiGet<{ message: string; product: ProductDetail }>(
      `/products/${encodeURIComponent(match.id)}`,
      undefined,
      locale,
    );
    return res.product;
  }
}

export async function getProductReviews(
  idOrSlug: string,
  params: { page?: number; limit?: number } = {},
  locale: Locale = "en",
): Promise<ReviewListResponse> {
  const id = await resolveToId(idOrSlug, locale);
  return apiGet<ReviewListResponse & { message: string }>(
    `/products/${encodeURIComponent(id)}/reviews`,
    params,
    locale,
  );
}

export async function getFrequentlyBoughtWith(
  idOrSlug: string,
  locale: Locale = "en",
): Promise<FrequentlyBoughtItem[]> {
  const id = await resolveToId(idOrSlug, locale);
  const res = await apiGet<{ message: string; products: FrequentlyBoughtItem[] }>(
    `/products/${encodeURIComponent(id)}/frequently-bought-with`,
    undefined,
    locale,
  );
  return res.products;
}

export async function listOffers(
  params: ListProductsParams = {},
  locale: Locale = "en",
): Promise<ProductListResponse> {
  const res = await apiGet<ProductListResponse & { message: string }>(
    "/offers",
    {
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
    },
    locale,
  );
  return {
    products: res.products,
    total: res.total,
    page: res.page,
    limit: res.limit,
    facets: res.facets ?? null,
  };
}

async function resolveToId(idOrSlug: string, locale: Locale = "en"): Promise<string> {
  // Same heuristic as getProduct.
  try {
    const res = await apiGet<{ message: string; product: { id: string } }>(
      `/products/${encodeURIComponent(idOrSlug)}`,
      undefined,
      locale,
    );
    return res.product.id;
  } catch {
    const list = await listProducts({ search: idOrSlug, limit: 5 }, locale);
    const match = list.products.find((p) => p.slug === idOrSlug);
    if (!match) throw new Error(`Product not found: ${idOrSlug}`);
    return match.id;
  }
}
