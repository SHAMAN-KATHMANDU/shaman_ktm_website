import { apiGet } from "@/lib/api/client";
import type {
  BlogCategory,
  BlogPostDetailResponse,
  BlogPostListResponse,
  BlogPostSummary,
  ListBlogPostsParams,
} from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listBlogPosts(
  params: ListBlogPostsParams = {},
  locale: Locale = "en",
): Promise<BlogPostListResponse> {
  const res = await apiGet<BlogPostListResponse & { message: string }>(
    "/blog/posts",
    params as Record<string, string | number | undefined>,
    locale,
  );
  return res;
}

export async function listFeaturedPosts(
  params: { limit?: number } = {},
  locale: Locale = "en",
): Promise<{ posts: BlogPostSummary[] }> {
  const res = await apiGet<{ message: string; posts: BlogPostSummary[] }>(
    "/blog/featured",
    params,
    locale,
  );
  return { posts: res.posts };
}

export async function listBlogCategories(): Promise<BlogCategory[]> {
  const res = await apiGet<{ message: string; categories: BlogCategory[] }>(
    "/blog/categories",
  );
  return res.categories;
}

export async function getBlogPost(
  slug: string,
  locale: Locale = "en",
): Promise<BlogPostDetailResponse> {
  const res = await apiGet<BlogPostDetailResponse & { message: string }>(
    `/blog/posts/${encodeURIComponent(slug)}`,
    undefined,
    locale,
  );
  return { post: res.post, related: res.related };
}
