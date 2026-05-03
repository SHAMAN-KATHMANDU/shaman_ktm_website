export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const revalidate = 60;

const load = unstable_cache(
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

export async function GET() {
  return NextResponse.json({ message: "ok", categories: await load() });
}
