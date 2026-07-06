// Single source of truth for the canonical site origin. SITE_ORIGIN is a
// plain (non-NEXT_PUBLIC) server var so the self-hosted standalone server can
// change it at runtime — NEXT_PUBLIC_* vars are inlined at BUILD time and the
// container env can't override them. Falls back to the legacy public var, then
// the bare domain. In production set SITE_ORIGIN=https://www.shamankathmandu.com
// so URLs match the live site (which redirects non-www → www).

// Treat blank/whitespace env values as unset — a set-but-empty var (e.g.
// `NEXT_PUBLIC_PROJECTX_ORIGIN=` in a .env) must not defeat the fallback,
// which plain `??` would allow (it only catches null/undefined).
function nonBlank(v: string | undefined): string | undefined {
  return v && v.trim() ? v.trim() : undefined;
}

export const siteUrl = (
  nonBlank(process.env.SITE_ORIGIN) ??
  nonBlank(process.env.NEXT_PUBLIC_PROJECTX_ORIGIN) ??
  "https://shamankathmandu.com"
).replace(/\/+$/, "");
