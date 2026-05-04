export const dynamic = "force-dynamic";

// Phase 2 of the upload flow: the browser calls this AFTER it has PUT the
// file to the presigned URL returned by /api/sysuser/media/sign. We HEAD the
// S3 object to confirm it actually exists, then create the Media row. If the
// PUT silently failed, we never write a row — the user retries cleanly
// instead of accumulating phantom "?" thumbnails.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminGuard } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { objectHead, s3PublicUrl } from "@/lib/s3";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";

const ConfirmBody = z
  .object({
    key: z.string().min(1).max(500),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
    alt: z.string().max(500).nullable().optional(),
  })
  .strict();

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, ConfirmBody);
  if (!parsed.ok) return parsed.response;
  const { key, width, height, alt } = parsed.data;

  // Refuse to record an upload that didn't land. Returns null on 403/404 too.
  const head = await objectHead(key);
  if (!head) {
    return NextResponse.json(
      {
        message:
          "Upload didn't reach storage. Likely a CORS or signature issue — please retry.",
      },
      { status: 422 },
    );
  }

  // If the same key already has a row (rare retry scenario), update it.
  const existing = await prisma.media.findUnique({ where: { key } });
  const data = {
    key,
    url: s3PublicUrl(key),
    mime: head.mime,
    bytes: head.bytes,
    width: width ?? undefined,
    height: height ?? undefined,
    alt: alt ?? undefined,
  };

  const row = existing
    ? await prisma.media.update({ where: { key }, data })
    : await prisma.media.create({ data });

  logAction({
    actor: g.session.email,
    action: existing ? "update" : "upload",
    entity: "Media",
    entityId: row.id,
    summary: `${key} (${head.mime}, ${head.bytes} bytes)`,
  });

  return NextResponse.json({ message: "ok", media: row });
}
