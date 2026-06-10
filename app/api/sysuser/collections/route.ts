export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { CollectionSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { createCollection } from "@/lib/cms/collections";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const rows = await prisma.collection.findMany({
    orderBy: [{ position: "asc" }, { title: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json({ message: "ok", collections: rows });
}

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, CollectionSchema);
  if (!parsed.ok) return parsed.response;

  let created;
  try {
    created = await createCollection(parsed.data);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }

  logAction({
    actor: g.session.email,
    action: "create",
    entity: "Collection",
    entityId: created.id,
    summary: created.title,
  });
  bumpTags(CACHE_TAGS.collections);
  return NextResponse.json({ message: "ok", collection: created });
}
