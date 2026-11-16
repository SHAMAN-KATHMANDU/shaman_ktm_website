import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { siteFromRow } from "./dto";
import { CACHE_TAGS } from "./tags";

export const getSite = unstable_cache(
  async () => {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    return row ? siteFromRow(row) : null;
  },
  ["public-site"],
  { tags: [CACHE_TAGS.site], revalidate: 60 },
);
