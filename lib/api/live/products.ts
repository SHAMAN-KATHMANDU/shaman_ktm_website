import { apiGet } from "@/lib/api/client";
import type {
  FrequentlyBoughtItem,
  ListProductsParams,
  ProductDetail,
  ProductListResponse,
  ReviewListResponse,
} from "@/lib/api/types";
import { listCategories } from "./categories";

async function resolveCategorySlugToId(slug: string): Promise<string | undefined> {
  const cats = await listCategories();
  return cats.find((c) => c.slug === slug)?.id;
}

export async function listProducts(
  params: ListProductsParams = {},
): Promise<ProductListResponse> {
  const { categorySlug, elementSlug, ...rest } = params;
  let categoryId = rest.categoryId;
  if (!categoryId && categorySlug) {
    categoryId = await resolveCategorySlugToId(categorySlug);
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
  );
  return {
    products: res.products,
    total: res.total,
    page: res.page,
    limit: res.limit,
    facets: res.facets ?? null,
  };
}

export async function getProduct(idOrSlug: string): Promise<ProductDetail> {
  // The live API uses :id (uuid). If we got a slug, find it via list.
  // Heuristic: uuids contain hyphens AND no spaces and length ~36; slugs are
  // also hyphenated, so we attempt direct first and fall back to a search.
  try {
    const res = await apiGet<{ message: string; product: ProductDetail }>(
      `/products/${encodeURIComponent(idOrSlug)}`,
    );
    return res.product;
  } catch {
    const list = await listProducts({ search: idOrSlug, limit: 5 });
    const match = list.products.find((p) => p.slug === idOrSlug);
    if (!match) throw new Error(`Product not found: ${idOrSlug}`);
    const res = await apiGet<{ message: string; product: ProductDetail }>(
      `/products/${encodeURIComponent(match.id)}`,
    );
    return res.product;
  }
}

export async function getProductReviews(
  idOrSlug: string,
  params: { page?: number; limit?: number } = {},
): Promise<ReviewListResponse> {
  const id = await resolveToId(idOrSlug);
  return apiGet<ReviewListResponse & { message: string }>(
    `/products/${encodeURIComponent(id)}/reviews`,
    params,
  );
}

export async function getFrequentlyBoughtWith(
  idOrSlug: string,
): Promise<FrequentlyBoughtItem[]> {
  const id = await resolveToId(idOrSlug);
  const res = await apiGet<{ message: string; products: FrequentlyBoughtItem[] }>(
    `/products/${encodeURIComponent(id)}/frequently-bought-with`,
  );
  return res.products;
}

export async function listOffers(
  params: ListProductsParams = {},
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
  );
  return {
    products: res.products,
    total: res.total,
    page: res.page,
    limit: res.limit,
    facets: res.facets ?? null,
  };
}

async function resolveToId(idOrSlug: string): Promise<string> {
  // Same heuristic as getProduct.
  try {
    const res = await apiGet<{ message: string; product: { id: string } }>(
      `/products/${encodeURIComponent(idOrSlug)}`,
    );
    return res.product.id;
  } catch {
    const list = await listProducts({ search: idOrSlug, limit: 5 });
    const match = list.products.find((p) => p.slug === idOrSlug);
    if (!match) throw new Error(`Product not found: ${idOrSlug}`);
    return match.id;
  }
}
