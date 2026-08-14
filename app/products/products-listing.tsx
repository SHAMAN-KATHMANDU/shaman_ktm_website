"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type {
  Category,
  ElementMeta,
  ElementSlug,
  ProductSort,
  ProductSummary,
} from "@/lib/api/types";
import { listProducts } from "@/lib/api";
import { splitLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { ProductCard } from "@/components/site/cards/product-card";
import { CategorySidebar } from "@/components/site/product/category-sidebar";
import { ElementChips } from "@/components/site/product/element-chips";

interface PriceFilterTier {
  value: number;
  label: string;
}

interface Filters {
  search?: string;
  categorySlug?: string;
  elementSlug?: ElementSlug;
  sort: ProductSort;
  maxPrice?: number;
  page: number;
}

interface Props {
  initialProducts: ProductSummary[];
  initialTotal: number;
  categories: Category[];
  /** The six nature elements, rendered as filter chips above the listing. */
  elements: ElementMeta[];
  /** CMS-driven price filter tiers. Falls back to the canonical 3 tiers. */
  priceTiers?: PriceFilterTier[];
  pageSize: number;
  initialFilters: Filters;
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

const selectCls =
  "select-flat bg-bone border border-line text-ink label-nav text-[11px] px-3 py-2 cursor-pointer rounded-input";

export function ProductsListing({
  initialProducts,
  initialTotal,
  categories,
  elements,
  priceTiers,
  pageSize,
  initialFilters,
}: Props) {
  const tiers =
    priceTiers && priceTiers.length > 0 ? priceTiers : DEFAULT_PRICE_TIERS;
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);

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
      elementSlug: filters.elementSlug,
      sort: filters.sort,
      maxPrice: filters.maxPrice,
      page: filters.page,
      limit: pageSize,
    }, locale)
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
    if (filters.elementSlug) params.set("element", filters.elementSlug);
    if (filters.sort !== "newest") params.set("sort", filters.sort);
    if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
    if (filters.page > 1) params.set("page", String(filters.page));
    const qs = params.toString();
    const href = locale === "ne"
      ? (qs ? `/ne/products?${qs}` : "/ne/products")
      : (qs ? `/products?${qs}` : "/products");
    router.replace(href, { scroll: false });

    return () => {
      cancelled = true;
    };
  }, [filters, pageSize, router, locale]);

  const set = (patch: Partial<Filters>) =>
    setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const sortOptions = makeSortOptions(t);

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12 lg:grid lg:grid-cols-[240px_1fr] lg:gap-10 lg:items-start">
      <div className="mb-8 lg:col-span-2 lg:mb-2">
        <ElementChips
          elements={elements}
          activeSlug={filters.elementSlug}
          allLabel={t.filters.allElements}
          locale={locale}
          onSelect={(slug) => set({ elementSlug: slug as ElementSlug | undefined })}
        />
      </div>
      <CategorySidebar
        categories={categories}
        activeSlug={filters.categorySlug}
        onSelect={(slug) => set({ categorySlug: slug })}
      />
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t.search.productsPlaceholder}
            aria-label="Search products"
            className="bg-bone border border-line text-ink placeholder:text-ink-soft text-sm px-4 py-2 w-full md:max-w-xs focus:border-metal outline-none rounded-input"
          />
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filters.sort}
              onChange={(e) => set({ sort: e.target.value as ProductSort })}
              aria-label="Sort products"
              className={selectCls}
            >
              {sortOptions.map((o) => (
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
          className="label-nav text-[10px] text-ink-soft mb-6"
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
                <div className="aspect-[3/4] w-full animate-pulse bg-cream border border-line" />
                <div className="h-4 w-3/4 animate-pulse bg-cream" />
                <div className="h-3 w-1/2 animate-pulse bg-cream" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="py-20 text-center text-ink-soft">
            {t.emptyStates.noProductsMatchFilters}
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
              className="label-nav text-[11px] px-4 py-2 border border-line text-ink enabled:hover:border-metal disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              {t.pagination.previous}
            </button>
            <span className="label-nav text-[10px] text-ink-soft">
              {t.pagination.page} <span className="text-metal-text">{filters.page}</span> {t.pagination.of} {totalPages}
            </span>
            <button
              type="button"
              disabled={filters.page >= totalPages || loading}
              onClick={() => set({ page: filters.page + 1 })}
              className="label-nav text-[11px] px-4 py-2 border border-line text-ink enabled:hover:border-metal disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              {t.pagination.next}
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}
