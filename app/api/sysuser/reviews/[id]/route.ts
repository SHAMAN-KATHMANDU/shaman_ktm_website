export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";

const PatchBody = z
  .object({
    isApproved: z.boolean(),
  })
  .strict();

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  const parsed = await parseJson(req, PatchBody);
  if (!parsed.ok) return parsed.response;

  const updated = await prisma.review.update({
    where: { id },
    data: {
      isApproved: parsed.data.isApproved,
      approvedAt: parsed.data.isApproved ? new Date() : null,
      approvedBy: parsed.data.isApproved ? g.session.email : null,
    },
  });
  logAction({
    actor: g.session.email,
    action: parsed.data.isApproved ? "publish" : "unpublish",
    entity: "Review",
    entityId: id,
    summary: `${updated.rating}★ "${updated.title}"`,
  });
  bumpTags(CACHE_TAGS.products);
  return NextResponse.json({ message: "ok", review: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { id } = await ctx.params;
  await prisma.review.delete({ where: { id } });
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "Review",
    entityId: id,
  });
  bumpTags(CACHE_TAGS.products);
  return NextResponse.json({ message: "ok" });
}
