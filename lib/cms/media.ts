// Shared media upload/update logic, called by BOTH the REST routes
// (/api/sysuser/media/*) and the MCP tools (lib/mcp/tools/media.ts).
// Extracts: key generation + presignPut + s3PublicUrl (sign phase),
// objectHead existence check (confirm phase), and upsert-by-key Media row.

import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { presignPut, s3PublicUrl, objectHead } from "@/lib/s3";
import { slugify } from "@/lib/slug";
import { CmsError } from "./errors";
import type { z } from "zod";
import type { MediaSignRequest } from "@/lib/validation/schemas";

export type MediaSignInput = z.infer<typeof MediaSignRequest>;

export interface SignedUploadResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export interface ConfirmUploadInput {
  key: string;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}

/**
 * Generate a presigned PUT URL and metadata for a media upload.
 * Phase 1: browser uses uploadUrl to PUT file bytes directly to S3.
 */
export async function signMediaUpload(
  input: MediaSignInput,
): Promise<SignedUploadResponse> {
  const { filename, contentType } = input;
  const ext = (filename.match(/\.[a-z0-9]+$/i)?.[0] ?? "").toLowerCase();
  const safe = slugify(filename.replace(/\.[a-z0-9]+$/i, ""));
  const datePart = new Date().toISOString().slice(0, 10);
  const key = `uploads/${datePart}/${safe}-${nanoid(8)}${ext}`;

  const uploadUrl = await presignPut(key, contentType);
  const publicUrl = s3PublicUrl(key);

  return { uploadUrl, publicUrl, key };
}

/**
 * Confirm an upload and create/update the Media row.
 * Phase 2: after browser PUT succeeds, we HEAD the S3 object to confirm
 * existence, then upsert the Media row by key.
 */
export async function confirmMediaUpload(input: ConfirmUploadInput) {
  const { key, width, height, alt } = input;

  // Refuse to record an upload that didn't land. Returns null on 403/404 too.
  const head = await objectHead(key);
  if (!head) {
    throw new CmsError(
      "Upload didn't reach storage. Likely a CORS or signature issue — please retry.",
      { statusCode: 422 },
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

  return {
    row,
    isNew: !existing,
  };
}

/**
 * Update metadata (alt, width, height) for an existing Media row.
 */
export async function updateMediaMetadata(
  id: string,
  input: {
    alt?: string | null;
    width?: number | null;
    height?: number | null;
  },
) {
  const existing = await prisma.media.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new CmsError(`No media with id "${id}".`, { statusCode: 404 });
  }

  return prisma.media.update({
    where: { id },
    data: {
      alt: input.alt ?? undefined,
      width: input.width ?? undefined,
      height: input.height ?? undefined,
    },
  });
}
