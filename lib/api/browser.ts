// Client-component surface. lib/api/index.ts pulls in Prisma for the live
// branch, so "use client" files import from here instead: live mode goes over
// HTTP to /api/public/v1, mock mode reads the bundled seeds.

import { IS_LIVE } from "./mode";
import { apiGet, type Query } from "./client";
import * as mockProducts from "./mock/products";
import * as mockBlog from "./mock/blog";
import type {
  BlogPostListResponse,
  ListBlogPostsParams,
  ListProductsParams,
  ProductListResponse,
} from "./types";
import type { Locale } from "@/lib/i18n/locale";

export function listProducts(
  params: ListProductsParams = {},
  locale: Locale = "en",
): Promise<ProductListResponse> {
  if (!IS_LIVE) return mockProducts.listProducts(params, locale);
  return apiGet<ProductListResponse>("/products", params as Query, locale);
}

export function listBlogPosts(
  params: ListBlogPostsParams = {},
  locale: Locale = "en",
): Promise<BlogPostListResponse> {
  if (!IS_LIVE) return mockBlog.listBlogPosts(params, locale);
  return apiGet<BlogPostListResponse>("/blog/posts", params as Query, locale);
}
