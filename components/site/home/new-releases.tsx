import { SectionHeading } from "@/components/site/shared/section-heading";
import { Button } from "@/components/site/shared/button";
import { ProductCard } from "@/components/site/cards/product-card";
import { getCuratedNewReleases } from "@/lib/api/server/homepage";
import { pickLocalized, localizeHref, type Locale } from "@/lib/i18n/locale";
import type { NavConfig, HomeCopy } from "@/lib/site-content";

export async function NewReleases({
  nav,
  homeCopy,
  locale,
}: {
  nav: NavConfig;
  homeCopy: HomeCopy;
  locale: Locale;
}) {
  const products = await getCuratedNewReleases(8);
  if (products.length === 0) return null;
  return (
    <section className="py-20 md:py-28 px-6 md:px-10 bg-[var(--color-surface)]/30">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={pickLocalized(homeCopy, "newReleasesEyebrow", locale)}
          title={pickLocalized(homeCopy, "newReleasesHeading", locale)}
          subtitle={pickLocalized(homeCopy, "newReleasesSubheading", locale) || undefined}
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
        {pickLocalized(nav, "newReleasesAllCta", locale).label && (
          <div className="mt-12 text-center">
            <Button
              href={localizeHref(pickLocalized(nav, "newReleasesAllCta", locale).href, locale)}
              external={pickLocalized(nav, "newReleasesAllCta", locale).external}
              variant="outline"
            >
              {pickLocalized(nav, "newReleasesAllCta", locale).label}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
