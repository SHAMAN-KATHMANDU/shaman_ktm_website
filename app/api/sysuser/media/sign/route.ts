export const dynamic = "force-dynamic";

// Returns a short-lived presigned PUT URL for direct browser → S3 uploads.
// NOTE: this endpoint no longer writes a Media row. The DB row is created by
// /api/sysuser/media/confirm AFTER the browser PUT succeeds and the object
// is verified to exist in S3. This prevents phantom rows pointing at objects
// that never landed (CORS failures, signature drift, network drops), which
// rendered as broken-image "?" thumbnails in the media library.

import { NextResponse } from "next/server";
import { adminGuard } from "@/lib/auth/guard";
import { MediaSignRequest } from "@/lib/validation/schemas";
import { parseJson } from "@/lib/api/server/respond";
import { signMediaUpload } from "@/lib/cms/media";

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, MediaSignRequest);
  if (!parsed.ok) return parsed.response;

  const { uploadUrl, publicUrl, key } = await signMediaUpload(parsed.data);

  return NextResponse.json({
    message: "ok",
    uploadUrl,
    publicUrl,
    key,
  });
}
