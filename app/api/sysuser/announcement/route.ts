export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { AnnouncementSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const row = await prisma.announcement.findUnique({ where: { id: 1 } });
  return NextResponse.json({ message: "ok", announcement: row });
}

export async function PUT(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, AnnouncementSchema);
  if (!parsed.ok) return parsed.response;
  const row = await prisma.announcement.upsert({
    where: { id: 1 },
    update: { ...parsed.data, href: parsed.data.href ?? null },
    create: { id: 1, ...parsed.data, href: parsed.data.href ?? null },
  });
  bumpTags(CACHE_TAGS.site);
  return NextResponse.json({ message: "ok", announcement: row });
}
