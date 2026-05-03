export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { SiteConfigSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
  return NextResponse.json({ message: "ok", site: row?.data ?? null });
}

export async function PUT(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, SiteConfigSchema);
  if (!parsed.ok) return parsed.response;
  const row = await prisma.siteConfig.upsert({
    where: { id: 1 },
    update: { data: parsed.data },
    create: { id: 1, data: parsed.data },
  });
  bumpTags(CACHE_TAGS.site);
  return NextResponse.json({ message: "ok", site: row.data });
}
