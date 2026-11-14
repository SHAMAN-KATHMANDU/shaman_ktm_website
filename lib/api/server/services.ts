import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { serviceFromRow } from "./dto";
import { CACHE_TAGS } from "./tags";
import type { Locale } from "@/lib/i18n/locale";

// Locale is a function argument so it joins the cache key.
export const listServices = unstable_cache(
  async (locale: Locale = "en") => {
    const rows = await prisma.service.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    return rows.map((r) => serviceFromRow(r, locale));
  },
  ["public-services"],
  { tags: [CACHE_TAGS.services], revalidate: 60 },
);
