export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ name: string }> },
) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const { name } = await ctx.params;
  const tag = decodeURIComponent(name);
  const affected = await prisma.blogPost.findMany({
    where: { tags: { has: tag } },
    select: { id: true, tags: true },
  });
  for (const p of affected) {
    await prisma.blogPost.update({
      where: { id: p.id },
      data: { tags: p.tags.filter((t) => t !== tag) },
    });
  }
  logAction({
    actor: g.session.email,
    action: "delete",
    entity: "BlogTag",
    entityId: tag,
    summary: `Removed "${tag}" from ${affected.length} post(s)`,
  });
  bumpTags(CACHE_TAGS.blog);
  return NextResponse.json({ message: "ok", updated: affected.length });
}
