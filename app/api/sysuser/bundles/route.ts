export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { BundleSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { createBundle } from "@/lib/cms/bundles";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const rows = await prisma.bundle.findMany({
    orderBy: [{ position: "asc" }, { title: "asc" }],
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          product: { select: { id: true, name: true, thumbnailUrl: true } },
        },
      },
    },
  });
  return NextResponse.json({ message: "ok", bundles: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, BundleSchema);
  if (!parsed.ok) return parsed.response;

  let created;
  try {
    created = await createBundle(parsed.data);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }

  logAction({
    actor: g.session.email,
    action: "create",
    entity: "Bundle",
    entityId: created.id,
    summary: created.title,
  });
  bumpTags(CACHE_TAGS.bundles);
  return NextResponse.json({ message: "ok", bundle: created });
}
