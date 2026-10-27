import type { MetadataRoute } from "next";

/**
 * The Nepali twin of an English absolute URL (insert /ne after the origin).
 */
export function toNe(url: string, origin: string): string {
  const path = url.slice(origin.length);
  return path === "" || path === "/" ? `${origin}/ne` : `${origin}/ne${path}`;
}

/**
 * Emit every URL in both locales, each cross-linked via hreflang alternates.
 * Includes x-default pointing to the English (base) URL.
 */
export function withLocales(
  entries: MetadataRoute.Sitemap,
  origin: string,
): MetadataRoute.Sitemap {
  return entries.flatMap((e) => {
    const ne = toNe(e.url, origin);
    const languages = { en: e.url, ne, "x-default": e.url };
    return [
      { ...e, alternates: { languages } },
      { ...e, url: ne, alternates: { languages } },
    ];
  });
}
