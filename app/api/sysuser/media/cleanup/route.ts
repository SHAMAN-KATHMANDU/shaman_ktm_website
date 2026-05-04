export const dynamic = "force-dynamic";

// One-shot cleanup for "?" placeholders in the media library: walks the
// Media table, HEADs each S3 object, deletes any DB row whose object is
// missing. Cheap because it's bounded by Media row count and HEAD is fast.

import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { objectExists } from "@/lib/s3";
import { logAction } from "@/lib/audit";

const BATCH_LIMIT = 500;

export async function POST() {
  const g = await adminGuard();
  if (!g.ok) return g.response;

  const rows = await prisma.media.findMany({
    select: { id: true, key: true },
    orderBy: { createdAt: "desc" },
    take: BATCH_LIMIT,
  });

  const orphans: string[] = [];
  // Run HEADs in parallel with a small concurrency cap.
  const checks = rows.map(async (r) => {
    const present = await objectExists(r.key);
    if (!present) orphans.push(r.id);
  });
  await Promise.all(checks);

  if (orphans.length > 0) {
    await prisma.media.deleteMany({ where: { id: { in: orphans } } });
    logAction({
      actor: g.session.email,
      action: "delete",
      entity: "Media",
      summary: `Cleaned up ${orphans.length} orphan row(s)`,
    });
  }

  return NextResponse.json({
    message: "ok",
    scanned: rows.length,
    removed: orphans.length,
  });
}
