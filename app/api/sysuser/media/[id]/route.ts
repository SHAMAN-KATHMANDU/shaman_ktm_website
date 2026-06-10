export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { deleteObject } from "@/lib/s3";
import { logAction } from "@/lib/audit";
import { parseJson } from "@/lib/api/server/respond";
import { updateMediaMetadata } from "@/lib/cms/media";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

const PatchBody = z
  .object({
    alt: z.string().nullable().optional(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
  })
  .strict();

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, PatchBody);
  if (!parsed.ok) return parsed.response;

  try {
    const updated = await updateMediaMetadata(id, parsed.data);
    logAction({
      actor: g.session.email,
      action: "update",
      entity: "Media",
      entityId: id,
      summary: parsed.data.alt ? `alt="${parsed.data.alt}"` : "metadata",
    });
    return NextResponse.json({ message: "ok", media: updated });
  } catch (err) {
    if (err instanceof CmsError) {
      return cmsErrorResponse(err);
    }
    throw err;
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const row = await prisma.media.findUnique({ where: { id } });
  if (!row) return NextResponse.json({ message: "Not found" }, { status: 404 });
  try {
    await deleteObject(row.key);
  } catch {
    // If S3 delete fails (key already gone), still drop the DB row.
  }
  await prisma.media.delete({ where: { id } });
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "Media",
    entityId: id,
    summary: row.key,
  });
  return NextResponse.json({ message: "ok" });
}
