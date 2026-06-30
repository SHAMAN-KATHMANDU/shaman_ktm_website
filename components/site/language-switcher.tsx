"use client";

// Toggles between English (unprefixed) and Nepali (`/ne/...`) while preserving
// the current path. Rendered in the header + mobile menu.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { splitLocale, localizeHref, type Locale } from "@/lib/i18n/locale";

const LABEL: Record<Locale, string> = { en: "EN", ne: "नेपाली" };
const FULL: Record<Locale, string> = { en: "English", ne: "Nepali" };

export function LanguageSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const { locale, path } = splitLocale(pathname);
  const other: Locale = locale === "en" ? "ne" : "en";

  return (
    <Link
      href={localizeHref(path, other)}
      hrefLang={other}
      aria-label={`Switch to ${FULL[other]}`}
      className={
        className ??
        "label-nav text-[var(--color-gold-muted)] hover:text-[var(--color-gold)] transition-colors"
      }
    >
      {LABEL[other]}
    </Link>
  );
}
