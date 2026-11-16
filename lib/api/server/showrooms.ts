import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { showroomFromRow } from "./dto";
import { CACHE_TAGS } from "./tags";
import type { Locale } from "@/lib/i18n/locale";
import { PHYSICAL_SHOWROOM_WHERE } from "@/lib/stock/constants";

// Locale is a function argument so it joins the cache key.
export const listShowrooms = unstable_cache(
  async (locale: Locale = "en") => {
    const rows = await prisma.showroom.findMany({
      where: { ...PHYSICAL_SHOWROOM_WHERE, active: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    return rows.map((r) => showroomFromRow(r, locale));
  },
  ["public-showrooms"],
  { tags: [CACHE_TAGS.showrooms], revalidate: 60 },
);
