"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Logo } from "./logo";
import { CloseIcon } from "@/components/site/icons";

interface Props {
  open: boolean;
  onClose: () => void;
  links: { href: string; label: string }[];
}

export function MobileMenu({ open, onClose, links }: Props) {
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
        <Logo />
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
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onClose}
            className="font-display text-3xl text-[var(--color-cream)] hover:text-[var(--color-gold)] transition-colors"
          >
            {l.label}
          </Link>
        ))}
        <div className="flex flex-col items-center gap-3 mt-6 label-nav text-[var(--color-gold-muted)]">
          <Link href="/account/login" onClick={onClose} className="hover:text-[var(--color-gold)]">
            Login
          </Link>
          <Link href="/account/dashboard" onClick={onClose} className="hover:text-[var(--color-gold)]">
            Account
          </Link>
          <Link href="/search" onClick={onClose} className="hover:text-[var(--color-gold)]">
            Search
          </Link>
        </div>
      </nav>
    </div>
  );
}
