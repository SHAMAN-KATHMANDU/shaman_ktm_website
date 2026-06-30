import { listProducts, listCategories } from "@/lib/api";
import type { ProductSort } from "@/lib/api/types";
import { getLocale } from "@/lib/i18n/server";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { ProductsListing } from "./products-listing";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Our Products — Shaman Kathmandu",
  description:
    "Browse the full Shaman Kathmandu catalog — filter by category, price, and more.",
};

async function getPriceTiers() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const tiers = (row?.data as { priceFilterTiers?: unknown } | null | undefined)
      ?.priceFilterTiers;
    if (!Array.isArray(tiers)) return undefined;
    return tiers
      .filter(
        (t): t is { value: number; label: string } =>
          !!t &&
          typeof t === "object" &&
          typeof (t as { value?: unknown }).value === "number" &&
          typeof (t as { label?: unknown }).label === "string",
      )
      .map((t) => ({ value: t.value, label: t.label }));
  } catch {
    return undefined;
  }
}

const SORTS: ProductSort[] = ["newest", "price_asc", "price_desc"];
const PAGE_SIZE = 24;

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const search = first(sp.search)?.trim() || undefined;
  const categorySlug = first(sp.category) || undefined;
  const sortRaw = first(sp.sort);
  const sort: ProductSort = SORTS.includes(sortRaw as ProductSort)
    ? (sortRaw as ProductSort)
    : "newest";
  const maxPriceRaw = Number(first(sp.maxPrice));
  const maxPrice =
    Number.isFinite(maxPriceRaw) && maxPriceRaw > 0 ? maxPriceRaw : undefined;
  const pageRaw = Number(first(sp.page));
  const page =
    Number.isInteger(pageRaw) && pageRaw > 1 ? pageRaw : 1;

  const locale = await getLocale();
  const [initial, categories, priceTiers, t] = await Promise.all([
    listProducts(
      {
        search,
        categorySlug,
        sort,
        maxPrice,
        page,
        limit: PAGE_SIZE,
      },
      locale,
    ),
    listCategories(locale),
    getPriceTiers(),
    (await import("@/lib/i18n/getDictionary")).getDictionary(locale),
  ]);

  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs
            items={[{ href: "/", label: t.breadcrumbs.home }, { label: t.breadcrumbs.ourProducts }]}
          />
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px]">
          <h1 className="font-display text-4xl md:text-5xl text-[var(--color-cream)]">
            {t.breadcrumbs.ourProducts}
          </h1>
        </section>
        <ProductsListing
          initialProducts={initial.products}
          initialTotal={initial.total}
          categories={categories}
          priceTiers={priceTiers}
          pageSize={PAGE_SIZE}
          initialFilters={{ search, categorySlug, sort, maxPrice, page }}
        />
      </SiteShell>
    </SiteProviders>
  );
}
