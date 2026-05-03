import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { showroomFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const revalidate = 60;

const load = unstable_cache(
  async () => {
    const rows = await prisma.showroom.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    return rows.map(showroomFromRow);
  },
  ["public-showrooms"],
  { tags: [CACHE_TAGS.showrooms], revalidate: 60 },
);

export async function GET() {
  return NextResponse.json({ message: "ok", showrooms: await load() });
}
