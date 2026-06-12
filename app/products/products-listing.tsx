"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Category, ProductSort, ProductSummary } from "@/lib/api/types";
import { listProducts } from "@/lib/api";
import { ProductCard } from "@/components/site/cards/product-card";

interface PriceFilterTier {
  value: number;
  label: string;
}

interface Filters {
  search?: string;
  categorySlug?: string;
  sort: ProductSort;
  maxPrice?: number;
  page: number;
}

interface Props {
  initialProducts: ProductSummary[];
  initialTotal: number;
  categories: Category[];
  /** CMS-driven price filter tiers. Falls back to the canonical 3 tiers. */
  priceTiers?: PriceFilterTier[];
  pageSize: number;
  initialFilters: Filters;
}

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price · Low to High" },
  { value: "price_desc", label: "Price · High to Low" },
];

const DEFAULT_PRICE_TIERS: PriceFilterTier[] = [
  { value: 1000, label: "Under NPR 1,000" },
  { value: 2500, label: "Under NPR 2,500" },
  { value: 5000, label: "Under NPR 5,000" },
];

const selectCls =
  "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-cream)] label-nav text-[11px] px-3 py-2 cursor-pointer";

export function ProductsListing({
  initialProducts,
  initialTotal,
  categories,
  priceTiers,
  pageSize,
  initialFilters,
}: Props) {
  const tiers =
    priceTiers && priceTiers.length > 0 ? priceTiers : DEFAULT_PRICE_TIERS;
  const router = useRouter();

  const [products, setProducts] = useState<ProductSummary[]>(initialProducts);
  const [total, setTotal] = useState<number>(initialTotal);
  const [searchInput, setSearchInput] = useState(initialFilters.search ?? "");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loading, setLoading] = useState(false);

  // Debounce free-text search into the filters object.
  useEffect(() => {
    const t = setTimeout(() => {
      const search = searchInput.trim() || undefined;
      setFilters((f) =>
        f.search === search ? f : { ...f, search, page: 1 },
      );
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    // The server already rendered results for the incoming URL — skip one fetch.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    let cancelled = false;
    setLoading(true);
    listProducts({
      search: filters.search,
      categorySlug: filters.categorySlug,
      sort: filters.sort,
      maxPrice: filters.maxPrice,
      page: filters.page,
      limit: pageSize,
    })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.products);
        setTotal(res.total);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Keep the URL shareable / back-button friendly.
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.categorySlug) params.set("category", filters.categorySlug);
    if (filters.sort !== "newest") params.set("sort", filters.sort);
    if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
    if (filters.page > 1) params.set("page", String(filters.page));
    const qs = params.toString();
    router.replace(qs ? `/products?${qs}` : "/products", { scroll: false });

    return () => {
      cancelled = true;
    };
  }, [filters, pageSize, router]);

  const set = (patch: Partial<Filters>) =>
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search products…"
          aria-label="Search products"
          className="bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-cream)] placeholder:text-[var(--color-gold-muted)] text-sm px-4 py-2 w-full md:max-w-xs focus:border-[var(--color-gold)] outline-none"
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filters.categorySlug ?? ""}
            onChange={(e) =>
              set({ categorySlug: e.target.value || undefined })
            }
            aria-label="Filter by category"
            className={selectCls}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filters.sort}
            onChange={(e) => set({ sort: e.target.value as ProductSort })}
            aria-label="Sort products"
            className={selectCls}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={filters.maxPrice ?? ""}
            onChange={(e) =>
              set({
                maxPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            aria-label="Filter by maximum price"
            className={selectCls}
          >
            <option value="">Any price</option>
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
        {total} {total === 1 ? "object" : "objects"}
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
          No products match those filters.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-12 flex items-center justify-center gap-6"
        >
          <button
            type="button"
            disabled={filters.page <= 1 || loading}
            onClick={() => set({ page: filters.page - 1 })}
            className="label-nav text-[11px] px-4 py-2 border border-[var(--color-border)] text-[var(--color-gold)] enabled:hover:border-[var(--color-gold)] disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            ← Previous
          </button>
          <span className="label-nav text-[10px] text-[var(--color-gold-muted)]">
            Page {filters.page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={filters.page >= totalPages || loading}
            onClick={() => set({ page: filters.page + 1 })}
            className="label-nav text-[11px] px-4 py-2 border border-[var(--color-border)] text-[var(--color-gold)] enabled:hover:border-[var(--color-gold)] disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            Next →
          </button>
        </nav>
      )}
    </section>
  );
}
