export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { pageSummaryFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { localeFromRequest, type Locale } from "@/lib/i18n/locale";

export const revalidate = 60;

// Locale is a function argument so it joins the cache key.
const load = unstable_cache(
  async (locale: Locale) => {
    const rows = await prisma.page.findMany({ orderBy: { slug: "asc" } });
    return rows.map((r) => pageSummaryFromRow(r, locale));
  },
  ["public-pages"],
  { tags: [CACHE_TAGS.pages], revalidate: 60 },
);

export async function GET(req: Request) {
  return NextResponse.json({ message: "ok", pages: await load(localeFromRequest(req)) });
}
