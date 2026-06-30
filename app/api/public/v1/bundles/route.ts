export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { bundleSummaryFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { localeFromRequest, type Locale } from "@/lib/i18n/locale";

export const revalidate = 60;

// Locale is a function argument so it joins the cache key.
const load = unstable_cache(
  async (locale: Locale) => {
    const rows = await prisma.bundle.findMany({
      orderBy: [{ position: "asc" }, { title: "asc" }],
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            product: {
              select: { id: true, name: true, thumbnailUrl: true },
            },
          },
        },
      },
    });
    return rows.map((r) => bundleSummaryFromRow(r, locale));
  },
  ["public-bundles"],
  { tags: [CACHE_TAGS.bundles], revalidate: 60 },
);

export async function GET(req: Request) {
  return NextResponse.json({ message: "ok", bundles: await load(localeFromRequest(req)) });
}
