"use client";

// Toggles between English (unprefixed) and Nepali (`/ne/...`) while preserving
// the current path. Rendered in the header + mobile menu.
//
// Deliberately a plain <a>, not next/link: /ne/* is a proxy REWRITE onto the
// same route tree, so a soft navigation matches identical segments and the
// router keeps the already-rendered locale. Only a full document load re-runs
// the proxy and applies the new x-locale header everywhere.

import { usePathname } from "next/navigation";
import { splitLocale, localizeHref, type Locale } from "@/lib/i18n/locale";

const LABEL: Record<Locale, string> = { en: "EN", ne: "नेपाली" };
const FULL: Record<Locale, string> = { en: "English", ne: "Nepali" };

export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const { locale, path } = splitLocale(pathname);
  const other: Locale = locale === "en" ? "ne" : "en";

  return (
    <a
      href={localizeHref(path, other)}
      hrefLang={other}
      onClick={(e) => {
        // Carry the current query/hash (filters, pagination) across the
        // locale switch. usePathname drops them, and useSearchParams would
        // force a Suspense boundary into every page for a click-time value.
        e.preventDefault();
        const { search, hash } = window.location;
        window.location.assign(localizeHref(path, other) + search + hash);
      }}
      aria-label={`Switch to ${FULL[other]}`}
      className={
        className ?? "label-nav text-ink-soft hover:text-ink transition-colors"
      }
    >
      {LABEL[other]}
    </a>
  );
}
