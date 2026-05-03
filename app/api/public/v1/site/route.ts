import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { siteFromRow } from "@/lib/api/server/dto";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const revalidate = 60;

const load = unstable_cache(
  async () => {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    if (!row) return null;
    return siteFromRow(row);
  },
  ["public-site"],
  { tags: [CACHE_TAGS.site], revalidate: 60 },
);

export async function GET() {
  const site = await load();
  if (!site) {
    return NextResponse.json({ message: "Not configured" }, { status: 404 });
  }
  return NextResponse.json({ message: "ok", site });
}
