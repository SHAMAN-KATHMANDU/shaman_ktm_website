import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { serviceFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const revalidate = 60;

const load = unstable_cache(
  async () => {
    const rows = await prisma.service.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    return rows.map(serviceFromRow);
  },
  ["public-services"],
  { tags: [CACHE_TAGS.services], revalidate: 60 },
);

export async function GET() {
  return NextResponse.json({ message: "ok", services: await load() });
}
