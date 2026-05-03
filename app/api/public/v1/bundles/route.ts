export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { bundleSummaryFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const revalidate = 60;

const load = unstable_cache(
  async () => {
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
    return rows.map(bundleSummaryFromRow);
  },
  ["public-bundles"],
  { tags: [CACHE_TAGS.bundles], revalidate: 60 },
);

export async function GET() {
  return NextResponse.json({ message: "ok", bundles: await load() });
}
