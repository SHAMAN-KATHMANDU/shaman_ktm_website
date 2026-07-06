// Turn a stored image path/URL into an absolute https URL that Meta (and OG
// crawlers) can fetch. Product images are stored either as absolute S3 URLs
// or as site-relative paths (e.g. "/singing bowl 1.png"); Meta requires
// absolute URLs, and raw spaces must be percent-encoded.

import { siteUrl } from "@/lib/site-url";

export function absoluteUrl(
  pathOrUrl: string | null | undefined,
): string | null {
  if (!pathOrUrl) return null;
  const v = pathOrUrl.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const path = v.startsWith("/") ? v : `/${v}`;
  // Encode spaces only — avoids double-encoding already-encoded paths.
  return `${siteUrl}${path.replace(/ /g, "%20")}`;
}
