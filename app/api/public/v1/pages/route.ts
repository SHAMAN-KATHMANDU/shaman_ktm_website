import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { pageSummaryFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const revalidate = 60;

const load = unstable_cache(
  async () => {
    const rows = await prisma.page.findMany({ orderBy: { slug: "asc" } });
    return rows.map(pageSummaryFromRow);
  },
  ["public-pages"],
  { tags: [CACHE_TAGS.pages], revalidate: 60 },
);

export async function GET() {
  return NextResponse.json({ message: "ok", pages: await load() });
}
