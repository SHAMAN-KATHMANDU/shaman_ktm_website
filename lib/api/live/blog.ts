import { found } from "@/lib/api/client";
import * as server from "@/lib/api/server/blog";
import type { BlogPostDetailResponse } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export const listBlogPosts = server.listBlogPosts;
export const listBlogCategories = server.listBlogCategories;

export async function getBlogPost(
  slug: string,
  locale: Locale = "en",
): Promise<BlogPostDetailResponse> {
  return found(await server.getBlogPost(slug, locale), `Blog post ${slug}`);
}
