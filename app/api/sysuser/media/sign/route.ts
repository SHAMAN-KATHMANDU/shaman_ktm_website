export const dynamic = "force-dynamic";

// Returns a short-lived presigned PUT URL for direct browser → S3 uploads.
// NOTE: this endpoint no longer writes a Media row. The DB row is created by
// /api/sysuser/media/confirm AFTER the browser PUT succeeds and the object
// is verified to exist in S3. This prevents phantom rows pointing at objects
// that never landed (CORS failures, signature drift, network drops), which
// rendered as broken-image "?" thumbnails in the media library.

import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { adminGuard } from "@/lib/auth/guard";
import { presignPut, s3PublicUrl } from "@/lib/s3";
import { MediaSignRequest } from "@/lib/validation/schemas";
import { parseJson } from "@/lib/api/server/respond";
import { slugify } from "@/lib/slug";

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, MediaSignRequest);
  if (!parsed.ok) return parsed.response;

  const { filename, contentType } = parsed.data;
  const ext = (filename.match(/\.[a-z0-9]+$/i)?.[0] ?? "").toLowerCase();
  const safe = slugify(filename.replace(/\.[a-z0-9]+$/i, ""));
  const datePart = new Date().toISOString().slice(0, 10);
  const key = `uploads/${datePart}/${safe}-${nanoid(8)}${ext}`;

  const uploadUrl = await presignPut(key, contentType);
  const publicUrl = s3PublicUrl(key);

  return NextResponse.json({
    message: "ok",
    uploadUrl,
    publicUrl,
    key,
  });
}
