// Pure locale helpers — safe to import from both Server and Client Components
// (no next/headers, no DB). The server-only `getLocale()` lives in
// lib/i18n/server.ts so this module stays usable in the browser.

export const LOCALES = ["en", "ne"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** The header the proxy sets so server components know the active locale. */
export const LOCALE_HEADER = "x-locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "ne";
}

/** Coerce an arbitrary value (e.g. a `?locale=` query param) to a Locale. */
export function localeFromValue(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Read the active locale from a request's `?locale=` query string. */
export function localeFromRequest(req: { url: string }): Locale {
  try {
    return localeFromValue(new URL(req.url).searchParams.get("locale"));
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Add an optional `<field>Ne` Nepali twin for every key of `T`. */
export type WithNepali<T> = T & {
  [K in keyof T as `${string & K}Ne`]?: T[K];
};

/**
 * Split a pathname into its locale prefix (if any) and the remaining path.
 * `/ne/products` → `{ locale: "ne", path: "/products" }`
 * `/products`    → `{ locale: "en", path: "/products" }`
 */
export function splitLocale(pathname: string): { locale: Locale; path: string } {
  const segments = pathname.split("/"); // ["", "ne", "products"]
  if (isLocale(segments[1])) {
    const locale = segments[1] as Locale;
    const rest = "/" + segments.slice(2).join("/");
    return { locale, path: rest === "/" ? "/" : rest.replace(/\/$/, "") };
  }
  return { locale: DEFAULT_LOCALE, path: pathname };
}

/** Strip any leading `/ne` (or `/en`) locale prefix from a pathname. */
export function stripLocale(pathname: string): string {
  return splitLocale(pathname).path;
}

/**
 * Build the URL for `path` under `locale`. English is unprefixed (root);
 * Nepali is served under `/ne`. `path` may already carry a locale prefix —
 * it is normalised away first so this is idempotent.
 */
export function localizeHref(path: string, locale: Locale): string {
  // Leave external / non-app links untouched.
  if (!path.startsWith("/")) return path;
  const bare = stripLocale(path);
  if (locale === DEFAULT_LOCALE) return bare;
  return bare === "/" ? "/ne" : `/ne${bare}`;
}

/**
 * Resolve a `<key>`/`<key>Ne` pair on any object for the active locale, with
 * fallback to English when the Nepali value is missing or empty.
 */
export function pickLocalized<T extends object, K extends keyof T & string>(
  obj: T,
  key: K,
  locale: Locale,
): T[K] {
  if (locale === "ne") {
    const ne = (obj as Record<string, unknown>)[`${key}Ne`];
    if (ne != null && ne !== "") return ne as T[K];
  }
  return obj[key];
}
