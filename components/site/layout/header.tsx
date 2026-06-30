"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import {
  HeartIcon,
  MenuIcon,
  SearchIcon,
} from "@/components/site/icons";
import { MobileMenu } from "./mobile-menu";
import type { NavConfig } from "@/lib/site-content";
import { splitLocale, localizeHref, pickLocalized } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { LanguageSwitcher } from "@/components/site/language-switcher";

export function Header({ nav }: { nav: NavConfig }) {
  const pathname = usePathname();
  const { locale, path } = splitLocale(pathname);
  const t = getDictionary(locale);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Nepali nav labels live in a parallel array; fall back to English.
  const headerLinks =
    locale === "ne" && nav.headerLinksNe?.length
      ? nav.headerLinksNe
      : nav.headerLinks;

  const isActive = (href: string) => {
    if (href === "/") return path === "/";
    return path === href || path.startsWith(`${href}/`);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 h-16 backdrop-blur-md border-b transition-colors ${
          scrolled
            ? "bg-[var(--color-base)]/90 border-[var(--color-border)]"
            : "bg-[var(--color-base)]/60 border-[var(--color-border-soft)]"
        }`}
      >
        <div className="mx-auto h-full max-w-[1400px] flex items-center justify-between px-6 md:px-10">
          <Logo href={localizeHref(nav.logoHref, locale)} />
          <nav
            className="hidden md:flex flex-1 items-center justify-center gap-8 px-6"
            aria-label="Primary"
          >
            {headerLinks.map((l) => {
              const active = !l.external && isActive(l.href);
              return (
                <Link
                  key={`${l.href}-${l.label}`}
                  href={l.external ? l.href : localizeHref(l.href, locale)}
                  target={l.external ? "_blank" : undefined}
                  rel={l.external ? "noopener noreferrer" : undefined}
                  aria-current={active ? "page" : undefined}
                  className={`label-nav transition-colors ${
                    active
                      ? "text-[var(--color-gold)]"
                      : "text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-4 text-[var(--color-gold-muted)]">
            {nav.headerSearchHref && (
              <Link
                href={localizeHref(nav.headerSearchHref, locale)}
                aria-label={t.nav.search}
                className="hidden sm:inline-flex p-1 hover:text-[var(--color-gold)] transition-colors"
              >
                <SearchIcon size={18} />
              </Link>
            )}
            {nav.headerWishlistHref && (
              <Link
                href={localizeHref(nav.headerWishlistHref, locale)}
                aria-label={t.nav.wishlist}
                className="hidden sm:inline-flex p-1 hover:text-[var(--color-gold)] transition-colors"
              >
                <HeartIcon size={18} />
              </Link>
            )}
            {pickLocalized(nav, "headerLoginLabel", locale) && nav.headerLoginHref && (
              <Link
                href={localizeHref(nav.headerLoginHref, locale)}
                className="hidden md:inline-flex label-nav text-[var(--color-gold-muted)] hover:text-[var(--color-gold)] transition-colors"
              >
                {pickLocalized(nav, "headerLoginLabel", locale)}
              </Link>
            )}
            <LanguageSwitcher />
            <button
              type="button"
              className="md:hidden p-1 hover:text-[var(--color-gold)]"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
            >
              <MenuIcon size={22} />
            </button>
          </div>
        </div>
      </header>
      <div className="h-16" aria-hidden />
      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        nav={nav}
      />
    </>
  );
}
