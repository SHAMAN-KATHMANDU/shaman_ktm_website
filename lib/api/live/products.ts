import { found } from "@/lib/api/client";
import * as server from "@/lib/api/server/products";
import type {
  ProductDetail,
  ProductSummary,
  ReviewListResponse,
} from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export const listProducts = server.listProducts;

export async function getProduct(idOrSlug: string, locale: Locale = "en"): Promise<ProductDetail> {
  return found(await server.getProduct(idOrSlug, locale), `Product ${idOrSlug}`);
}

export async function getProductReviews(
  idOrSlug: string,
  params: { page?: number; limit?: number } = {},
): Promise<ReviewListResponse> {
  return found(await server.getProductReviews(idOrSlug, params), `Product ${idOrSlug}`);
}

export async function getRelatedProducts(
  idOrSlug: string,
  locale: Locale = "en",
): Promise<ProductSummary[]> {
  return found(await server.getRelatedProducts(idOrSlug, locale), `Product ${idOrSlug}`);
}
