"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import { Logo } from "./logo";
import { LangToggle } from "../i18n/lang-toggle";
import { T } from "../i18n/t";

const NAV_LINKS: { href: string; en: string; np: string }[] = [
  { href: "/shop", en: "Shop All", np: "सबै" },
  { href: "/shop?category=jewelry", en: "Jewelry", np: "गहना" },
  { href: "/shop?category=spiritual", en: "Spiritual", np: "आध्यात्मिक" },
  { href: "/shop?category=statues", en: "Statues", np: "मूर्ति" },
  { href: "/shop?category=home-decor", en: "Home Decor", np: "घर सजावट" },
];

const DRAWER_LINKS: { href: string; en: string; np: string }[] = [
  { href: "/shop", en: "All Products", np: "सबै उत्पादन" },
  { href: "/shop?category=jewelry", en: "Jewelry", np: "गहना" },
  { href: "/shop?category=spiritual", en: "Spiritual", np: "आध्यात्मिक" },
  { href: "/shop?category=statues", en: "Statues", np: "मूर्ति" },
  { href: "/shop?category=home-decor", en: "Home Decor", np: "घर सजावट" },
  { href: "/shop?category=furniture", en: "Furniture", np: "फर्निचर" },
  { href: "/shop?category=gifts", en: "Gifts", np: "उपहार" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  return (
    <>
      <div className="sk-ann-bar">
        <T
          en={
            <>
              ✦ <strong>New:</strong> Crystal Singing Bowls &amp; Seashell
              Chandeliers —{" "}
              <Link href="/shop">Shop New Arrivals →</Link>
            </>
          }
          np={
            <>
              ✦ <strong>नयाँ:</strong> क्रिस्टल बाउल र सिशेल झूमर —{" "}
              <Link href="/shop">अहिले हेर्नुहोस् →</Link>
            </>
          }
        />
      </div>

      <header className={`sk-hdr${scrolled ? " sk-scrolled" : ""}`}>
        <div className="sk-wrap">
          <div className="sk-hdr-inner">
            <Logo />

            <nav className="sk-main-nav" aria-label="Primary">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="sk-nav-link">
                  <T en={link.en} np={link.np} />
                </Link>
              ))}
            </nav>

            <div className="sk-hdr-actions">
              <LangToggle />
              <button
                type="button"
                className="sk-icon-btn sk-hide-sm"
                aria-label="Search"
              >
                <Search size={18} strokeWidth={2} />
              </button>
              <button
                type="button"
                className="sk-icon-btn sk-hide-sm"
                aria-label="Wishlist"
              >
                <Heart size={18} strokeWidth={2} />
              </button>
              <Link
                href="/shop"
                className="sk-cart-btn sk-hide-sm"
                aria-label="Shop"
              >
                <ShoppingBag size={15} strokeWidth={2.2} />
                <T en="Shop" np="पसल" />
              </Link>
              <button
                type="button"
                className="sk-icon-btn sk-show-sm"
                aria-label="Open menu"
                onClick={() => setDrawerOpen(true)}
              >
                <Menu size={22} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        className={`sk-drawer-overlay${drawerOpen ? " sk-open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setDrawerOpen(false);
        }}
        aria-hidden={!drawerOpen}
      >
        <div className="sk-drawer-panel" role="dialog" aria-modal="true">
          <div className="sk-drawer-head">
            <Logo />
            <button
              className="sk-drawer-close"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              type="button"
            >
              <X size={22} strokeWidth={2} />
            </button>
          </div>
          <ul className="sk-drawer-nav">
            {DRAWER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={() => setDrawerOpen(false)}>
                  <T en={link.en} np={link.np} />
                  <ChevronRight size={16} strokeWidth={2} />
                </Link>
              </li>
            ))}
          </ul>
          <div className="sk-drawer-footer">
            <LangToggle className="sk-lang-toggle sk-lang-toggle-wide" />
          </div>
        </div>
      </div>
    </>
  );
}
