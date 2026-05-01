import { apiGet } from "@/lib/api/client";
import type {
  BlogCategory,
  BlogPostDetailResponse,
  BlogPostListResponse,
  BlogPostSummary,
  ListBlogPostsParams,
} from "@/lib/api/types";

export async function listBlogPosts(
  params: ListBlogPostsParams = {},
): Promise<BlogPostListResponse> {
  const res = await apiGet<BlogPostListResponse & { message: string }>(
    "/blog/posts",
    params as Record<string, string | number | undefined>,
  );
  return res;
}

export async function listFeaturedPosts(
  params: { limit?: number } = {},
): Promise<{ posts: BlogPostSummary[] }> {
  const res = await apiGet<{ message: string; posts: BlogPostSummary[] }>(
    "/blog/featured",
    params,
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
): Promise<BlogPostDetailResponse> {
  const res = await apiGet<BlogPostDetailResponse & { message: string }>(
    `/blog/posts/${encodeURIComponent(slug)}`,
  );
  return { post: res.post, related: res.related };
}
