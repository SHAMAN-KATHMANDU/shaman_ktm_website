"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./logo";
import {
  CartIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
} from "@/components/site/icons";
import { MobileMenu } from "./mobile-menu";
import { useCart } from "@/context/cart-context";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/nature", label: "Nature" },
  { href: "/energy", label: "Energy" },
  { href: "/stories", label: "Shaman Stories" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { count } = useCart();

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
          <div className="flex items-center gap-10">
            <Logo />
            <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="label-nav text-[var(--color-gold-muted)] hover:text-[var(--color-gold)] transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-[var(--color-gold-muted)]">
            <Link
              href="/search"
              aria-label="Search"
              className="hidden sm:inline-flex p-1 hover:text-[var(--color-gold)] transition-colors"
            >
              <SearchIcon size={18} />
            </Link>
            <Link
              href="/account/dashboard"
              aria-label="Wishlist"
              className="hidden sm:inline-flex p-1 hover:text-[var(--color-gold)] transition-colors"
            >
              <HeartIcon size={18} />
            </Link>
            <Link
              href="/account/login"
              className="hidden md:inline-flex label-nav text-[var(--color-gold-muted)] hover:text-[var(--color-gold)] transition-colors"
            >
              Login
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative p-1 hover:text-[var(--color-gold)] transition-colors"
            >
              <CartIcon size={18} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-gold)] text-[var(--color-base)] text-[10px] font-semibold flex items-center justify-center">
                  {count}
                </span>
              )}
            </Link>
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
        links={NAV_LINKS}
      />
    </>
  );
}
