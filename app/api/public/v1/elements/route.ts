export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { elementFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const revalidate = 60;

const load = unstable_cache(
  async () => {
    const rows = await prisma.element.findMany({
      orderBy: [{ position: "asc" }, { slug: "asc" }],
    });
    return rows.map(elementFromRow);
  },
  ["public-elements"],
  { tags: [CACHE_TAGS.elements], revalidate: 60 },
);

export async function GET() {
  return NextResponse.json({ message: "ok", elements: await load() });
}
