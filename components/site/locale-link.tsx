"use client";

// Drop-in replacement for next/link that keeps the visitor inside their
// current locale. When viewing `/ne/...`, an internal `href="/products"` is
// rewritten to `/ne/products`; English (the default) stays unprefixed.
// External and non-path hrefs pass through untouched.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { splitLocale, localizeHref } from "@/lib/i18n/locale";

type LinkProps = ComponentProps<typeof Link>;

export function LocaleLink({ href, ...rest }: LinkProps) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const localized =
    typeof href === "string" ? localizeHref(href, locale) : href;
  return <Link href={localized} {...rest} />;
}
