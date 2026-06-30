import {
  findPostBySlug,
  mockBlogCategories,
  mockPosts,
} from "@/data/mock/posts";
import type {
  BlogCategory,
  BlogPostDetailResponse,
  BlogPostListResponse,
  BlogPostSummary,
  ListBlogPostsParams,
} from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

const toSummary = (p: (typeof mockPosts)[number]): BlogPostSummary => ({
  id: p.id,
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  heroImageUrl: p.heroImageUrl,
  heroVideoEmbedUrl: p.heroVideoEmbedUrl,
  authorName: p.authorName,
  category: p.category,
  tags: p.tags,
  publishedAt: p.publishedAt,
  readingMinutes: p.readingMinutes,
});

export async function listBlogPosts(
  params: ListBlogPostsParams = {},
  locale: Locale = "en",
): Promise<BlogPostListResponse> {
  const { page = 1, limit = 10, categorySlug, tag, q } = params;
  let items = mockPosts.slice();

  if (categorySlug) items = items.filter((p) => p.category.slug === categorySlug);
  if (tag) items = items.filter((p) => p.tags.includes(tag));
  if (q) {
    const ql = q.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(ql) ||
        p.excerpt.toLowerCase().includes(ql),
    );
  }
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  const total = items.length;
  const start = (page - 1) * limit;
  return {
    posts: items.slice(start, start + limit).map(toSummary),
    total,
    page,
    limit,
  };
}

export async function listFeaturedPosts(
  params: { limit?: number } = {},
  locale: Locale = "en",
): Promise<{ posts: BlogPostSummary[] }> {
  const { limit = 4 } = params;
  return {
    posts: mockPosts
      .slice()
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .slice(0, limit)
      .map(toSummary),
  };
}

export async function listBlogCategories(): Promise<BlogCategory[]> {
  return mockBlogCategories;
}

export async function getBlogPost(
  slug: string,
  locale: Locale = "en",
): Promise<BlogPostDetailResponse> {
  const post = findPostBySlug(slug);
  if (!post) throw new Error(`Post not found: ${slug}`);
  const related = mockPosts
    .filter(
      (p) => p.slug !== post.slug && p.category.slug === post.category.slug,
    )
    .slice(0, 4)
    .map(toSummary);
  return { post, related };
}
