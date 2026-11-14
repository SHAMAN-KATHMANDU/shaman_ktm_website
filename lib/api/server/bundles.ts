import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { bundleDetailFromRow, bundleSummaryFromRow } from "./dto";
import { CACHE_TAGS } from "./tags";
import type { BundleDetail } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

const ITEMS_INCLUDE = {
  items: {
    where: { product: { status: "published" } },
    orderBy: { position: "asc" },
    include: { product: { select: { id: true, name: true, thumbnailUrl: true } } },
  },
} as const;

// Locale is a function argument so it joins the cache key.
export const listBundles = unstable_cache(
  async (locale: Locale = "en") => {
    const rows = await prisma.bundle.findMany({
      orderBy: [{ position: "asc" }, { title: "asc" }],
      include: ITEMS_INCLUDE,
    });
    return rows.map((r) => bundleSummaryFromRow(r, locale));
  },
  ["public-bundles"],
  { tags: [CACHE_TAGS.bundles], revalidate: 60 },
);

export async function getBundle(slug: string, locale: Locale = "en"): Promise<BundleDetail | null> {
  const row = await prisma.bundle.findUnique({ where: { slug }, include: ITEMS_INCLUDE });
  return row ? bundleDetailFromRow(row, locale) : null;
}
