// Pure guards for server-side media ingestion (MCP `upload_media`):
// SSRF protection for URL fetches, Google Drive share-link rewriting, and
// content sniffing via sharp. Kept free of Prisma/S3 so it unit-tests cleanly.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import sharp from "sharp";
import { ALLOWED_MEDIA_MIME } from "@/lib/validation/schemas";
import { CmsError } from "./errors";

/** Decoded-byte cap for base64 payloads (Telegram documents are ≤ 20 MB, photos ~1–2 MB). */
export const MAX_BASE64_BYTES = 10 * 1024 * 1024;
/** Byte cap when the server fetches a remote URL. Bigger files → two-phase presigned flow. */
export const MAX_FETCH_BYTES = 25 * 1024 * 1024;
/** Remote fetch timeout — must stay under nginx proxy_read_timeout for /api/mcp. */
export const FETCH_TIMEOUT_MS = 20_000;

// ─── SSRF guard ──────────────────────────────────────────────────────────────

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

const PRIVATE_V4: Array<[number, number]> = [
  [ipv4ToInt("0.0.0.0")!, ipv4ToInt("0.255.255.255")!], // "this" network
  [ipv4ToInt("10.0.0.0")!, ipv4ToInt("10.255.255.255")!],
  [ipv4ToInt("100.64.0.0")!, ipv4ToInt("100.127.255.255")!], // CGNAT
  [ipv4ToInt("127.0.0.0")!, ipv4ToInt("127.255.255.255")!],
  [ipv4ToInt("169.254.0.0")!, ipv4ToInt("169.254.255.255")!], // link-local + AWS metadata
  [ipv4ToInt("172.16.0.0")!, ipv4ToInt("172.31.255.255")!],
  [ipv4ToInt("192.168.0.0")!, ipv4ToInt("192.168.255.255")!],
  [ipv4ToInt("224.0.0.0")!, ipv4ToInt("255.255.255.255")!], // multicast + reserved
];

export function isPrivateIPv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparsable → treat as unsafe
  return PRIVATE_V4.some(([lo, hi]) => n >= lo && n <= hi);
}

export function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (v === "::" || v === "::1") return true;
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  if (/^fe[89ab][0-9a-f]:/.test(v)) return true; // fe80::/10 link-local
  if (/^f[cd][0-9a-f]{2}:/.test(v)) return true; // fc00::/7 unique-local
  if (/^ff[0-9a-f]{2}:/.test(v)) return true; // multicast
  return false;
}

export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIPv4(ip);
  if (kind === 6) return isPrivateIPv6(ip);
  return true;
}

/**
 * Throws CmsError(400) when `hostname` is a loopback/private/link-local target
 * — either literally or after DNS resolution (catches rebinding to 169.254.169.254).
 */
export async function assertPublicHost(
  hostname: string,
  resolver: (h: string) => Promise<Array<{ address: string }>> = (h) =>
    lookup(h, { all: true }),
): Promise<void> {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const reject = (why: string) =>
    new CmsError(`Refusing to fetch "${hostname}": ${why}.`, {
      statusCode: 400,
    });
  if (!host || host === "localhost" || host.endsWith(".localhost")) {
    throw reject("loopback hosts are not allowed");
  }
  if (isIP(host.replace(/^\[|\]$/g, ""))) {
    if (isPrivateAddress(host.replace(/^\[|\]$/g, ""))) {
      throw reject("private/internal IP addresses are not allowed");
    }
    return;
  }
  let addrs: Array<{ address: string }>;
  try {
    addrs = await resolver(host);
  } catch {
    throw reject("hostname did not resolve");
  }
  if (!addrs.length) throw reject("hostname did not resolve");
  for (const { address } of addrs) {
    if (isPrivateAddress(address)) {
      throw reject(`it resolves to a private address (${address})`);
    }
  }
}

// ─── Google Drive share links ────────────────────────────────────────────────

/**
 * Rewrites Drive "share" URLs to the direct-download form. Only files shared
 * as "anyone with the link" work; private files come back as an HTML login
 * page which fetchRemoteMedia rejects with a helpful hint.
 */
export function rewriteDriveUrl(input: string): string {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    return input;
  }
  const host = u.hostname.toLowerCase();
  if (host !== "drive.google.com" && host !== "docs.google.com") return input;
  let id: string | null = null;
  const m = u.pathname.match(/\/file\/d\/([\w-]+)/);
  if (m) id = m[1];
  else if (u.pathname === "/open" || u.pathname === "/uc") {
    id = u.searchParams.get("id");
  }
  if (!id) return input;
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
}

// ─── Content sniffing ────────────────────────────────────────────────────────

const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
};

export const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export interface SniffResult {
  mime: string;
  width?: number;
  height?: number;
}

/**
 * Determine the real media type of `buffer`. Images are sniffed with sharp
 * (declared type is ignored — a PNG uploaded as image/jpeg is stored as PNG,
 * an HTML page declared as image/jpeg is rejected). Videos cannot be sniffed
 * by sharp, so the declared type is trusted if it is an allowlisted video
 * mime and the bytes are not an image.
 */
export async function sniffMedia(
  buffer: Buffer,
  declaredMime?: string | null,
): Promise<SniffResult> {
  const declared = declaredMime?.split(";")[0].trim().toLowerCase() || null;

  let sniffed: SniffResult | null = null;
  try {
    const meta = await sharp(buffer, { limitInputPixels: false }).metadata();
    // sharp reports AVIF under the HEIF container as format "heif" with
    // compression "av1"; HEIC (hevc) stays unsupported (no browser support).
    const format =
      meta.format === "heif" && meta.compression === "av1"
        ? "avif"
        : meta.format;
    const mime = format ? SHARP_FORMAT_TO_MIME[format] : undefined;
    if (mime) {
      sniffed = { mime, width: meta.width, height: meta.height };
    } else if (format) {
      // sharp recognised something we don't allow (svg, tiff, pdf, heic…)
      throw new CmsError(
        `Unsupported image format "${format}". Use JPEG, PNG, WebP, AVIF or GIF.`,
        { statusCode: 400 },
      );
    }
  } catch (err) {
    if (err instanceof CmsError) throw err;
    // Not an image sharp can read — fall through to the video branch.
  }

  if (sniffed) return sniffed;

  if (declared && declared.startsWith("video/") && ALLOWED_MEDIA_MIME.has(declared)) {
    if (looksLikeText(buffer)) {
      throw new CmsError(
        "The bytes look like a text/HTML document, not a video. If this was a share link, make sure the file is public.",
        { statusCode: 422 },
      );
    }
    return { mime: declared };
  }

  throw new CmsError(
    declared
      ? `Could not recognise the file as ${declared}. Supported: JPEG, PNG, WebP, AVIF, GIF, MP4, WebM, MOV.`
      : "Could not recognise the file type. Pass contentType, or use a direct link to a JPEG/PNG/WebP/AVIF/GIF/MP4/WebM/MOV file.",
    { statusCode: 422 },
  );
}

/** Cheap heuristic: HTML/JSON/text bodies (login pages, error pages). */
export function looksLikeText(buffer: Buffer): boolean {
  const head = buffer.subarray(0, 512).toString("latin1").trimStart().toLowerCase();
  if (head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<?xml") || head.startsWith("{") ) {
    return true;
  }
  let printable = 0;
  const sample = buffer.subarray(0, 256);
  for (const b of sample) {
    if ((b >= 0x20 && b < 0x7f) || b === 0x0a || b === 0x0d || b === 0x09) printable++;
  }
  return sample.length > 0 && printable / sample.length > 0.95;
}
