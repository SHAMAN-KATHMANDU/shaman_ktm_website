// Returns a short-lived presigned PUT URL for direct browser → S3 uploads,
// plus the resulting public URL the editor stores in the entity's image field.

import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { adminGuard } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { presignPut, s3PublicUrl } from "@/lib/s3";
import { MediaSignRequest } from "@/lib/validation/schemas";
import { parseJson } from "@/lib/api/server/respond";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await adminGuard();
  if (!g.ok) return g.response;

  const parsed = await parseJson(req, MediaSignRequest);
  if (!parsed.ok) return parsed.response;

  const { filename, contentType, bytes } = parsed.data;
  const ext = (filename.match(/\.[a-z0-9]+$/i)?.[0] ?? "").toLowerCase();
  const safe = slugify(filename.replace(/\.[a-z0-9]+$/i, ""));
  const datePart = new Date().toISOString().slice(0, 10);
  const key = `uploads/${datePart}/${safe}-${nanoid(8)}${ext}`;

  const uploadUrl = await presignPut(key, contentType);
  const publicUrl = s3PublicUrl(key);

  await prisma.media.create({
    data: {
      key,
      url: publicUrl,
      mime: contentType,
      bytes,
    },
  });

  return NextResponse.json({
    message: "ok",
    uploadUrl,
    publicUrl,
    key,
  });
}
