import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { categoryFromRow } from "./dto";
import { CACHE_TAGS } from "./tags";
import type { Locale } from "@/lib/i18n/locale";

// Locale is a function argument so it joins the cache key — critical to avoid
// serving Nepali data from English cache.
export const listCategories = unstable_cache(
  async (locale: Locale = "en") => {
    const rows = await prisma.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      // Count only what the storefront can actually show.
      include: {
        _count: {
          select: { products: { where: { status: "published" } } },
        },
      },
    });
    return rows.map((r) => categoryFromRow(r, locale));
  },
  ["public-categories"],
  { tags: [CACHE_TAGS.categories], revalidate: 60 },
);
