"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type {
  ElementSlug,
  ProductSort,
  ProductSummary,
} from "@/lib/api/types";
import { listProducts } from "@/lib/api";
import { splitLocale, type Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { ProductCard } from "@/components/site/cards/product-card";

interface PriceFilterTier {
  value: number;
  label: string;
}

interface Props {
  element: ElementSlug;
  initialProducts: ProductSummary[];
  initialTotal: number;
  /** CMS-driven price filter tiers. Falls back to the canonical 3 tiers. */
  priceTiers?: PriceFilterTier[];
  locale: Locale;
}

const makeSortOptions = (t: ReturnType<typeof getDictionary>): { value: ProductSort; label: string }[] => [
  { value: "newest", label: t.filters.sortNewest },
  { value: "price_asc", label: t.filters.sortPriceAsc },
  { value: "price_desc", label: t.filters.sortPriceDesc },
];

const DEFAULT_PRICE_TIERS: PriceFilterTier[] = [
  { value: 1000, label: "Under NPR 1,000" },
  { value: 2500, label: "Under NPR 2,500" },
  { value: 5000, label: "Under NPR 5,000" },
];

export function ElementListing({
  element,
  initialProducts,
  initialTotal,
  priceTiers,
  locale: initialLocale,
}: Props) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const tiers = priceTiers && priceTiers.length > 0
    ? priceTiers
    : DEFAULT_PRICE_TIERS;
  const [products, setProducts] = useState<ProductSummary[]>(initialProducts);
  const [total, setTotal] = useState<number>(initialTotal);
  const [sort, setSort] = useState<ProductSort>("newest");
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [energy, setEnergy] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const sortOptions = makeSortOptions(t);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listProducts({
      elementSlug: element,
      sort,
      maxPrice,
      attr: energy ? `energy:${energy}` : undefined,
      limit: 24,
    }, locale)
      .then((res) => {
        if (cancelled) return;
        setProducts(res.products);
        setTotal(res.total);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [element, sort, maxPrice, energy, locale]);

  // Energy options derived from currently visible products' tags.
  const energyOptions = Array.from(
    new Set(
      initialProducts
        .flatMap((p) => p.tags ?? [])
        .filter(
          (t) =>
            !["new", "member", "showroom-only"].includes(t) &&
            !t.startsWith("product:") &&
            !t.startsWith("element:"),
        ),
    ),
  ).slice(0, 8);

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEnergy(undefined)}
            className={`label-nav text-[10px] px-3 py-2 border transition-colors ${
              energy === undefined
                ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                : "border-[var(--color-border)] text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
            }`}
          >
            {t.common.all}
          </button>
          {energyOptions.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEnergy(e)}
              className={`label-nav text-[10px] px-3 py-2 border transition-colors ${
                energy === e
                  ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                  : "border-[var(--color-border)] text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ProductSort)}
            className="select-flat bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-cream)] label-nav text-[11px] px-3 py-2 cursor-pointer"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={maxPrice ?? ""}
            onChange={(e) =>
              setMaxPrice(e.target.value ? Number(e.target.value) : undefined)
            }
            className="select-flat bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-cream)] label-nav text-[11px] px-3 py-2 cursor-pointer"
          >
            <option value="">{t.filters.anyPrice}</option>
            {tiers.map((tier) => (
              <option key={tier.value} value={tier.value}>
                {tier.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p
        className="label-nav text-[10px] text-[var(--color-gold-muted)] mb-6"
        aria-live="polite"
      >
        {total} {total === 1 ? t.common.object : t.common.objects}
      </p>

      {loading ? (
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5"
          aria-busy="true"
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[3/4] w-full animate-pulse bg-[var(--color-surface)] border border-[var(--color-border)]" />
              <div className="h-4 w-3/4 animate-pulse bg-[var(--color-surface)]" />
              <div className="h-3 w-1/2 animate-pulse bg-[var(--color-surface)]" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <p className="py-20 text-center text-[var(--color-gold-muted)]">
          {t.emptyStates.noProductsMatchFilters}
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}
