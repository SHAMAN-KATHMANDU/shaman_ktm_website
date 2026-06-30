export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { serviceFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { localeFromRequest, type Locale } from "@/lib/i18n/locale";

export const revalidate = 60;

// Locale is a function argument so it joins the cache key.
const load = unstable_cache(
  async (locale: Locale) => {
    const rows = await prisma.service.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    return rows.map((r) => serviceFromRow(r, locale));
  },
  ["public-services"],
  { tags: [CACHE_TAGS.services], revalidate: 60 },
);

export async function GET(req: Request) {
  return NextResponse.json({ message: "ok", services: await load(localeFromRequest(req)) });
}
