export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { categoryFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { localeFromRequest, type Locale } from "@/lib/i18n/locale";

export const revalidate = 60;

// Locale is a function argument so it joins the cache key — critical to avoid
// serving Nepali data from English cache.
const load = unstable_cache(
  async (locale: Locale) => {
    const rows = await prisma.category.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    return rows.map((r) => categoryFromRow(r, locale));
  },
  ["public-categories"],
  { tags: [CACHE_TAGS.categories], revalidate: 60 },
);

export async function GET(req: Request) {
  return NextResponse.json({ message: "ok", categories: await load(localeFromRequest(req)) });
}
