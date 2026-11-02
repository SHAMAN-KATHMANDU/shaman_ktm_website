// Media size and type limits shared between server and client.
// This module contains only pure data — no server-only imports.

// Tight allowlist — better than `image/*` because that lets through risky
// formats like `image/svg+xml` (executable) or `image/heic` (no browser
// support). Add explicit entries here when a new format becomes safe.
export const ALLOWED_MEDIA_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
]);

// Cap for direct browser → S3 uploads (admin media library and upload links).
export const MAX_DIRECT_UPLOAD_BYTES = 200 * 1024 * 1024;

export function getReadableFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + " " + sizes[i];
}
