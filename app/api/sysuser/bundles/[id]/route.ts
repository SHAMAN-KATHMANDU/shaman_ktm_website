export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { BundleSchema } from "@/lib/validation/schemas";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { updateBundle } from "@/lib/cms/bundles";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const row = await prisma.bundle.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          product: { select: { id: true, name: true, thumbnailUrl: true } },
        },
      },
    },
  });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "ok", bundle: row });
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, BundleSchema);
  if (!parsed.ok) return parsed.response;

  let updated;
  try {
    updated = await updateBundle(id, parsed.data);
  } catch (err) {
    if (err instanceof CmsError) return cmsErrorResponse(err);
    throw err;
  }

  logAction({
    actor: g.session.email,
    action: "update",
    entity: "Bundle",
    entityId: id,
    summary: updated?.title ?? null,
  });
  bumpTags(CACHE_TAGS.bundles);
  return NextResponse.json({ message: "ok", bundle: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  await prisma.bundle.delete({ where: { id } });
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "Bundle",
    entityId: id,
  });
  bumpTags(CACHE_TAGS.bundles);
  return NextResponse.json({ message: "ok" });
}
