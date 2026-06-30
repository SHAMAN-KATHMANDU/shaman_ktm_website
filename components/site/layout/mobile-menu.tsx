"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";
import { CloseIcon } from "@/components/site/icons";
import type { NavConfig } from "@/lib/site-content";
import { splitLocale, localizeHref } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

interface Props {
  open: boolean;
  onClose: () => void;
  nav: NavConfig;
}

export function MobileMenu({ open, onClose, nav }: Props) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] bg-[var(--color-base)]/95 backdrop-blur flex flex-col"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between h-16 px-6 border-b border-[var(--color-border)]">
        <Logo href={nav.logoHref} />
        <button
          type="button"
          aria-label="Close menu"
          className="p-1 text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
          onClick={onClose}
        >
          <CloseIcon size={24} />
        </button>
      </div>
      <nav
        className="flex-1 flex flex-col items-center justify-center gap-6 text-center"
        aria-label="Mobile primary"
      >
        {nav.headerLinks.map((l) => (
          <Link
            key={`${l.href}-${l.label}`}
            href={l.external ? l.href : localizeHref(l.href, locale)}
            target={l.external ? "_blank" : undefined}
            rel={l.external ? "noopener noreferrer" : undefined}
            onClick={onClose}
            className="font-display text-3xl text-[var(--color-cream)] hover:text-[var(--color-gold)] transition-colors"
          >
            {l.label}
          </Link>
        ))}
        <div className="flex flex-col items-center gap-3 mt-6 label-nav text-[var(--color-gold-muted)]">
          {nav.headerLoginLabel && nav.headerLoginHref && (
            <Link
              href={localizeHref(nav.headerLoginHref, locale)}
              onClick={onClose}
              className="hover:text-[var(--color-gold)]"
            >
              {nav.headerLoginLabel}
            </Link>
          )}
          {nav.headerWishlistHref && (
            <Link
              href={localizeHref(nav.headerWishlistHref, locale)}
              onClick={onClose}
              className="hover:text-[var(--color-gold)]"
            >
              {t.nav.account}
            </Link>
          )}
          {nav.headerSearchHref && (
            <Link
              href={localizeHref(nav.headerSearchHref, locale)}
              onClick={onClose}
              className="hover:text-[var(--color-gold)]"
            >
              {t.nav.search}
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
