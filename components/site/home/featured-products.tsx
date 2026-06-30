import { SectionHeading } from "@/components/site/shared/section-heading";
import { ProductCard } from "@/components/site/cards/product-card";
import { getFeaturedProducts } from "@/lib/api/server/homepage";
import { pickLocalized, type Locale } from "@/lib/i18n/locale";
import type { NavConfig, HomeCopy } from "@/lib/site-content";

export async function FeaturedProducts({
  nav,
  homeCopy,
  locale,
}: {
  nav: NavConfig;
  homeCopy: HomeCopy;
  locale: Locale;
}) {
  const products = await getFeaturedProducts(8);
  if (products.length === 0) return null;
  return (
    <section className="py-20 md:py-28 px-6 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={pickLocalized(homeCopy, "featuredProductsEyebrow", locale)}
          title={pickLocalized(homeCopy, "featuredProductsHeading", locale)}
          subtitle={pickLocalized(homeCopy, "featuredProductsSubheading", locale) || undefined}
          className="mb-12"
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              ctaLabel={nav.ctaProductEnquireLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
