export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { adminGuard } from "@/lib/auth/guard";
import { parseJson, bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";

export async function GET() {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const posts = await prisma.blogPost.findMany({
    select: { tags: true },
  });
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  const tags = [...counts.entries()]
    .map(([name, postCount]) => ({ name, postCount }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ message: "ok", tags });
}

const RenameSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export async function PUT(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;
  const parsed = await parseJson(req, RenameSchema);
  if (!parsed.ok) return parsed.response;
  const { from, to } = parsed.data;
  if (from === to) {
    return NextResponse.json({ message: "ok", updated: 0 });
  }
  const affected = await prisma.blogPost.findMany({
    where: { tags: { has: from } },
    select: { id: true, tags: true },
  });
  for (const p of affected) {
    const next = Array.from(
      new Set(p.tags.map((t) => (t === from ? to : t))),
    );
    await prisma.blogPost.update({
      where: { id: p.id },
      data: { tags: next },
    });
  }
  logAction({
    actor: g.session.email,
    action: "update",
    entity: "BlogTag",
    entityId: from,
    summary: `Renamed "${from}" → "${to}" on ${affected.length} post(s)`,
  });
  bumpTags(CACHE_TAGS.blog);
  return NextResponse.json({ message: "ok", updated: affected.length });
}
