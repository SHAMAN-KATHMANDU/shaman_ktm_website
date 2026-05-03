export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { HomepageConfigSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const row = await prisma.homepageConfig.findUnique({ where: { id: 1 } });
  return NextResponse.json({ message: "ok", homepage: row?.data ?? null });
}

export async function PUT(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, HomepageConfigSchema);
  if (!parsed.ok) return parsed.response;
  const row = await prisma.homepageConfig.upsert({
    where: { id: 1 },
    update: { data: parsed.data },
    create: { id: 1, data: parsed.data },
  });
  bumpTags(CACHE_TAGS.homepage, CACHE_TAGS.products, CACHE_TAGS.blog);
  return NextResponse.json({ message: "ok", homepage: row.data });
}
