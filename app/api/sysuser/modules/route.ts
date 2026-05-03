export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { ModulesSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { DEFAULT_MODULES } from "@/lib/site-modules";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
  const stored =
    row?.data && typeof row.data === "object" && "modules" in row.data
      ? ((row.data as { modules?: Record<string, boolean> }).modules ?? {})
      : {};
  return NextResponse.json({
    message: "ok",
    modules: { ...DEFAULT_MODULES, ...stored },
  });
}

export async function PUT(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, ModulesSchema);
  if (!parsed.ok) return parsed.response;

  const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
  const data = (row?.data as Record<string, unknown> | null) ?? {};
  const next = {
    ...data,
    modules: { ...DEFAULT_MODULES, ...(data.modules as object), ...parsed.data },
  };
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    update: { data: next },
    create: { id: 1, data: next },
  });

  bumpTags(CACHE_TAGS.site);
  return NextResponse.json({ message: "ok", modules: next.modules });
}
