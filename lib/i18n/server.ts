// Server-only locale accessor. The proxy sets the `x-locale` request header
// from the URL prefix (`/ne/...` → "ne", everything else → "en"); server
// components read it here. Kept separate from lib/i18n/locale.ts so the pure
// helpers there stay importable from Client Components.

import { LOCALE_HEADER, localeFromValue, type Locale } from "./locale";

export async function getLocale(): Promise<Locale> {
  // Dynamic import keeps `next/headers` out of the static import graph, so
  // SiteShell (which calls this) can still be referenced by the "use client"
  // account pages without tripping next/headers' client-bundle guard at build.
  const { headers } = await import("next/headers");
  const h = await headers();
  return localeFromValue(h.get(LOCALE_HEADER));
}
