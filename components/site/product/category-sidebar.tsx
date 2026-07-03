"use client";

// Category filter for the products listing. Renders twice from one source of
// truth: a vertical sidebar on lg+ screens and a horizontal chip scroller
// below that breakpoint. Selection is lifted to the parent (ProductsListing),
// which owns filter state and URL sync.

import type { Category } from "@/lib/api/types";
import { splitLocale } from "@/lib/i18n/locale";
import { usePathname } from "next/navigation";
import { getDictionary } from "@/lib/i18n/getDictionary";

interface Props {
  categories: Category[];
  activeSlug?: string;
  onSelect: (slug?: string) => void;
}

export function CategorySidebar({ categories, activeSlug, onSelect }: Props) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);

  const total = categories.reduce((sum, c) => sum + c.productCount, 0);
  const items: { slug?: string; label: string; count: number }[] = [
    { slug: undefined, label: t.filters.allCategories, count: total },
    ...categories.map((c) => ({
      slug: c.slug,
      label: c.name,
      count: c.productCount,
    })),
  ];

  return (
    <>
      {/* Desktop: vertical sidebar */}
      <nav
        aria-label={t.filters.browseCategories}
        className="hidden lg:block sticky top-24 self-start"
      >
        <h2 className="label-eyebrow text-[var(--color-gold-muted)] mb-4">
          {t.filters.browseCategories}
        </h2>
        <ul className="space-y-1">
          {items.map((item) => {
            const active = (activeSlug ?? undefined) === item.slug;
            return (
              <li key={item.slug ?? "__all"}>
                <button
                  type="button"
                  onClick={() => onSelect(item.slug)}
                  aria-current={active ? "true" : undefined}
                  className={`relative w-full flex items-baseline justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "bg-[var(--color-surface)] text-[var(--color-gold)]"
                      : "text-[var(--color-cream)] hover:text-[var(--color-gold)]"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-0.5 rounded-full bg-[var(--color-gold)]" />
                  )}
                  <span className="truncate">{item.label}</span>
                  <span className="label-nav text-[10px] text-[var(--color-gold-muted)]">
                    {item.count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile / tablet: horizontal chip scroller */}
      <nav
        aria-label={t.filters.browseCategories}
        className="lg:hidden -mx-6 md:-mx-10 px-6 md:px-10 mb-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul className="flex w-max gap-2 snap-x">
          {items.map((item) => {
            const active = (activeSlug ?? undefined) === item.slug;
            return (
              <li key={item.slug ?? "__all"} className="snap-start">
                <button
                  type="button"
                  onClick={() => onSelect(item.slug)}
                  aria-current={active ? "true" : undefined}
                  className={`label-nav text-[11px] whitespace-nowrap px-4 py-2 border transition-colors ${
                    active
                      ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-cream)]"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
