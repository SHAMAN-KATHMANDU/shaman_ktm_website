export const dynamic = "force-dynamic";

// Phase 2 of the upload flow: the browser calls this AFTER it has PUT the
// file to the presigned URL returned by /api/sysuser/media/sign. We HEAD the
// S3 object to confirm it actually exists, then create the Media row. If the
// PUT silently failed, we never write a row — the user retries cleanly
// instead of accumulating phantom "?" thumbnails.

import { NextResponse } from "next/server";
import { z } from "zod";
import { adminGuard } from "@/lib/auth/guard";
import { parseJson } from "@/lib/api/server/respond";
import { logAction } from "@/lib/audit";
import { confirmMediaUpload } from "@/lib/cms/media";
import { objectHead } from "@/lib/s3";
import { CmsError, cmsErrorResponse } from "@/lib/cms/errors";

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

  try {
    const { row, isNew } = await confirmMediaUpload({
      key,
      width,
      height,
      alt,
    });

    const head = await objectHead(key);
    logAction({
      actor: g.session.email,
      action: isNew ? "upload" : "update",
      entity: "Media",
      entityId: row.id,
      summary: `${key} (${head?.mime}, ${head?.bytes} bytes)`,
    });

    return NextResponse.json({ message: "ok", media: row });
  } catch (err) {
    if (err instanceof CmsError) {
      return cmsErrorResponse(err);
    }
    throw err;
  }
}
