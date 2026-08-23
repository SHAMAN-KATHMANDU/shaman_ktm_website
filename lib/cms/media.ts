// Shared media upload/update logic, called by BOTH the REST routes
// (/api/sysuser/media/*) and the MCP tools (lib/mcp/tools/media.ts).
// Extracts: key generation + presignPut + s3PublicUrl (sign phase),
// objectHead existence check (confirm phase), and upsert-by-key Media row.
// Also hosts the one-shot server-side path (MCP upload_media): fetch a public
// URL or decode base64, sniff, putObject, upsert Media row.

import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { presignPut, putObject, s3PublicUrl, objectHead } from "@/lib/s3";
import { slugify } from "@/lib/slug";
import { CmsError } from "./errors";
import type { z } from "zod";
import type {
  MediaSignRequest,
  UploadMediaInput,
} from "@/lib/validation/schemas";
import {
  assertPublicHost,
  rewriteDriveUrl,
  sniffMedia,
  looksLikeText,
  MIME_TO_EXT,
  MAX_BASE64_BYTES,
  MAX_FETCH_BYTES,
  FETCH_TIMEOUT_MS,
} from "./media-guards";

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
 * Object key for a new upload: uploads/YYYY-MM-DD/<slugified-name>-<nanoid8><ext>.
 * `forceExt` overrides the filename's extension (used when the sniffed mime
 * disagrees with the name, e.g. "photo.jpg" that is really a PNG).
 */
export function mediaKeyFor(filename: string, forceExt?: string): string {
  const ext =
    forceExt ?? (filename.match(/\.[a-z0-9]+$/i)?.[0] ?? "").toLowerCase();
  const safe = slugify(filename.replace(/\.[a-z0-9]+$/i, "")) || "upload";
  const datePart = new Date().toISOString().slice(0, 10);
  return `uploads/${datePart}/${safe}-${nanoid(8)}${ext}`;
}

/**
 * Generate a presigned PUT URL and metadata for a media upload.
 * Phase 1: browser uses uploadUrl to PUT file bytes directly to S3.
 */
export async function signMediaUpload(
  input: MediaSignInput,
): Promise<SignedUploadResponse> {
  const { filename, contentType } = input;
  const key = mediaKeyFor(filename);

  const uploadUrl = await presignPut(key, contentType);
  const publicUrl = s3PublicUrl(key);

  return { uploadUrl, publicUrl, key };
}

/** Create the Media row for `key`, or update it if a retry already made one. */
export async function upsertMediaRow(input: {
  key: string;
  mime: string;
  bytes: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}) {
  const existing = await prisma.media.findUnique({
    where: { key: input.key },
  });
  const data = {
    key: input.key,
    url: s3PublicUrl(input.key),
    mime: input.mime,
    bytes: input.bytes,
    width: input.width ?? undefined,
    height: input.height ?? undefined,
    alt: input.alt ?? undefined,
  };
  const row = existing
    ? await prisma.media.update({ where: { key: input.key }, data })
    : await prisma.media.create({ data });
  return { row, isNew: !existing };
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
  return upsertMediaRow({
    key,
    mime: head.mime,
    bytes: head.bytes,
    width,
    height,
    alt,
  });
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

// ─── One-shot server-side upload (MCP upload_media) ──────────────────────────

export interface UploadBytesInput {
  buffer: Buffer;
  filename: string;
  declaredMime?: string | null;
  alt?: string | null;
}

/**
 * Store `buffer` as-is in S3 and create the Media row. The real type is
 * sniffed (images via sharp — also yields width/height); the object key's
 * extension follows the sniffed type. No resizing/transcoding, matching the
 * admin uploader.
 */
export async function uploadMediaBytes(input: UploadBytesInput) {
  const { buffer, filename, declaredMime, alt } = input;
  if (!buffer.length) {
    throw new CmsError("The file is empty.", { statusCode: 400 });
  }
  const sniff = await sniffMedia(buffer, declaredMime);
  const key = mediaKeyFor(filename, MIME_TO_EXT[sniff.mime]);
  await putObject(key, buffer, sniff.mime);
  const { row, isNew } = await upsertMediaRow({
    key,
    mime: sniff.mime,
    bytes: buffer.length,
    width: sniff.width ?? null,
    height: sniff.height ?? null,
    alt: alt ?? null,
  });
  return { row, isNew };
}

export interface RemoteMedia {
  buffer: Buffer;
  mime: string | null;
  filename: string;
  finalUrl: string;
}

/**
 * Fetch a public https URL into memory with SSRF, redirect, size and time
 * guards. Google Drive share links are rewritten to their direct-download
 * form; an HTML response (private file, login page) is rejected with a hint.
 */
export async function fetchRemoteMedia(
  sourceUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RemoteMedia> {
  let current = rewriteDriveUrl(sourceUrl.trim());
  const deadline = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let res: Response | null = null;

  for (let hop = 0; hop < 5; hop++) {
    let u: URL;
    try {
      u = new URL(current);
    } catch {
      throw new CmsError(`"${current}" is not a valid URL.`, {
        statusCode: 400,
      });
    }
    if (u.protocol !== "https:") {
      throw new CmsError("Only https:// URLs can be fetched.", {
        statusCode: 400,
      });
    }
    if (u.username || u.password) {
      throw new CmsError("URLs with embedded credentials are not allowed.", {
        statusCode: 400,
      });
    }
    await assertPublicHost(u.hostname);

    try {
      res = await fetchImpl(u, {
        redirect: "manual",
        signal: deadline,
        headers: { "user-agent": "shamanktm-cms/1.0 (+media import)" },
      });
    } catch (err) {
      const timedOut =
        err instanceof Error &&
        (err.name === "TimeoutError" || err.name === "AbortError");
      throw new CmsError(
        timedOut
          ? `Fetching the URL took longer than ${FETCH_TIMEOUT_MS / 1000}s. Use a faster host or the two-phase sign_media_upload flow.`
          : `Could not fetch the URL: ${err instanceof Error ? err.message : String(err)}`,
        { statusCode: 422 },
      );
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) break;
      current = new URL(loc, u).toString();
      // Drain the body so the connection can be reused.
      await res.arrayBuffer().catch(() => undefined);
      res = null;
      continue;
    }
    break;
  }

  if (!res) {
    throw new CmsError("Too many redirects while fetching the URL.", {
      statusCode: 422,
    });
  }
  if (!res.ok) {
    throw new CmsError(
      `The URL responded with HTTP ${res.status}. Make sure it is public and points directly at the file.`,
      { statusCode: 422 },
    );
  }

  const declaredLen = Number(res.headers.get("content-length") ?? "0");
  if (declaredLen > MAX_FETCH_BYTES) {
    throw new CmsError(
      `File is ${(declaredLen / 1048576).toFixed(1)} MB; the URL import cap is ${MAX_FETCH_BYTES / 1048576} MB. Use sign_media_upload for large files.`,
      { statusCode: 413 },
    );
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  const reader = res.body?.getReader();
  if (!reader) {
    throw new CmsError("The URL returned an empty body.", { statusCode: 422 });
  }
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_FETCH_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw new CmsError(
        `File exceeds the ${MAX_FETCH_BYTES / 1048576} MB URL import cap. Use sign_media_upload for large files.`,
        { statusCode: 413 },
      );
    }
    chunks.push(value);
  }
  const buffer = Buffer.concat(chunks);

  const ctype =
    res.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ??
    null;
  const textish =
    !!ctype &&
    (ctype.startsWith("text/") ||
      ctype === "application/json" ||
      ctype === "application/xhtml+xml");
  if (textish || looksLikeText(buffer)) {
    throw new CmsError(
      'The URL returned a web page, not a file (private Google Drive link, login page, or a share page). Share the file as "anyone with the link" or use a direct file URL.',
      { statusCode: 422 },
    );
  }

  const finalUrl = res.url || current;
  const filename =
    filenameFromContentDisposition(res.headers.get("content-disposition")) ||
    filenameFromUrl(finalUrl) ||
    "upload";

  return { buffer, mime: ctype, filename, finalUrl };
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = header.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* fall through */
    }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
}

function filenameFromUrl(url: string): string | null {
  try {
    const last = new URL(url).pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : null;
  } catch {
    return null;
  }
}

/** Decode + cap a base64 payload (accepts data: URLs and raw base64). */
export function decodeBase64Media(b64: string): Buffer {
  let payload = b64.trim();
  const dataUrl = payload.match(/^data:[^;,]+;base64,([\s\S]*)$/);
  if (dataUrl) payload = dataUrl[1];
  payload = payload.replace(/\s+/g, "");
  // 4 base64 chars → 3 bytes; reject before allocating anything large.
  const approx = Math.floor((payload.length * 3) / 4);
  if (approx > MAX_BASE64_BYTES) {
    throw new CmsError(
      `base64 payload decodes to ~${(approx / 1048576).toFixed(1)} MB; the cap is ${MAX_BASE64_BYTES / 1048576} MB. Use sourceUrl or sign_media_upload for larger files.`,
      { statusCode: 413 },
    );
  }
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload)) {
    throw new CmsError("base64 payload contains invalid characters.", {
      statusCode: 400,
    });
  }
  const buf = Buffer.from(payload, "base64");
  if (!buf.length) {
    throw new CmsError("base64 payload is empty.", { statusCode: 400 });
  }
  return buf;
}

/**
 * MCP `upload_media` entry point: exactly one of sourceUrl / base64.
 */
export async function uploadMediaFromInput(input: UploadMediaInput) {
  const hasUrl = !!input.sourceUrl?.trim();
  const hasB64 = !!input.base64?.trim();
  if (hasUrl === hasB64) {
    throw new CmsError(
      "Pass exactly one of `sourceUrl` (public https link) or `base64` (file bytes).",
      { statusCode: 400 },
    );
  }

  if (hasB64) {
    if (!input.contentType) {
      throw new CmsError(
        "`contentType` is required with `base64` (e.g. image/jpeg).",
        { statusCode: 400 },
      );
    }
    const buffer = decodeBase64Media(input.base64!);
    return uploadMediaBytes({
      buffer,
      filename: input.filename ?? "upload",
      declaredMime: input.contentType,
      alt: input.alt ?? null,
    });
  }

  const remote = await fetchRemoteMedia(input.sourceUrl!);
  return uploadMediaBytes({
    buffer: remote.buffer,
    filename: input.filename ?? remote.filename,
    declaredMime: input.contentType ?? remote.mime,
    alt: input.alt ?? null,
  });
}
