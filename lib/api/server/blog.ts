import type { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { blogPostDetailFromRow, blogPostSummaryFromRow } from "./dto";
import { CACHE_TAGS } from "./tags";
import type {
  BlogPostDetailResponse,
  BlogPostListResponse,
  ListBlogPostsParams,
} from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

const int = (v: number | undefined, fallback: number) =>
  v !== undefined && Number.isFinite(v) ? Math.trunc(v) : fallback;

export async function listBlogPosts(
  params: ListBlogPostsParams = {},
  locale: Locale = "en",
): Promise<BlogPostListResponse> {
  const page = Math.max(1, int(params.page, 1));
  const limit = Math.min(50, Math.max(1, int(params.limit, 10)));
  const where: Prisma.BlogPostWhereInput = { status: "published" };
  if (params.categorySlug) where.categorySlug = params.categorySlug;
  if (params.tag) where.tags = { has: params.tag };
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { excerpt: { contains: params.q, mode: "insensitive" } },
    ];
  }
  const [rows, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { category: true },
    }),
    prisma.blogPost.count({ where }),
  ]);
  return {
    posts: rows.map((r) => blogPostSummaryFromRow(r, locale)),
    total,
    page,
    limit,
  };
}

export const listBlogCategories = unstable_cache(
  async () => {
    const rows = await prisma.blogCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { posts: true } } },
    });
    return rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      description: r.description,
      postCount: r._count.posts,
    }));
  },
  ["public-blog-categories"],
  { tags: [CACHE_TAGS.blog, CACHE_TAGS.blogCategories], revalidate: 60 },
);

export async function getBlogPost(
  slug: string,
  locale: Locale = "en",
): Promise<BlogPostDetailResponse | null> {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!post || post.status !== "published") return null;
  const related = await prisma.blogPost.findMany({
    where: {
      slug: { not: slug },
      status: "published",
      categorySlug: post.categorySlug,
    },
    orderBy: { publishedAt: "desc" },
    take: 4,
    include: { category: true },
  });
  return {
    post: blogPostDetailFromRow(post, locale),
    related: related.map((r) => blogPostSummaryFromRow(r, locale)),
  };
}
