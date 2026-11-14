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
  // The route matches id OR slug, so no client-side fallback is needed.
  const res = await apiGet<{ message: string; product: ProductDetail }>(
    `/products/${encodeURIComponent(idOrSlug)}`,
    undefined,
    locale,
  );
  return res.product;
}

export async function getProductReviews(
  idOrSlug: string,
  params: { page?: number; limit?: number } = {},
  locale: Locale = "en",
): Promise<ReviewListResponse> {
  return apiGet<ReviewListResponse & { message: string }>(
    `/products/${encodeURIComponent(idOrSlug)}/reviews`,
    params,
    locale,
  );
}

export async function getFrequentlyBoughtWith(
  idOrSlug: string,
  locale: Locale = "en",
): Promise<FrequentlyBoughtItem[]> {
  const res = await apiGet<{ message: string; products: FrequentlyBoughtItem[] }>(
    `/products/${encodeURIComponent(idOrSlug)}/frequently-bought-with`,
    undefined,
    locale,
  );
  return res.products;
}
