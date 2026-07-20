import { Button } from "@/components/site/shared/button";
import { ProductCard } from "@/components/site/cards/product-card";
import { getCampaignRail } from "@/lib/api/server/homepage";
import { getSiteModules } from "@/lib/site-modules";
import { pickLocalized, localizeHref, type Locale } from "@/lib/i18n/locale";
import type { HomeCopy } from "@/lib/site-content";

// Seasonal campaign rail (homeCampaignRail module) — e.g. Shrawan jewelry.
// Products come from the configured collection; the offer price renders as
// compareAtPrice struck through → price, plus a computed member price line
// when memberDiscountPercent > 0.
export async function CampaignRail({
  homeCopy,
  locale,
}: {
  homeCopy: HomeCopy;
  locale: Locale;
}) {
  const [rail, modules] = await Promise.all([
    getCampaignRail(locale),
    getSiteModules(),
  ]);
  if (!rail) return null;

  const note = pickLocalized(homeCopy, "campaignNote", locale);
  const blurb = pickLocalized(homeCopy, "campaignBlurb", locale);
  const ctaLabel = pickLocalized(homeCopy, "campaignCtaLabel", locale);

  return (
    <section
      id="campaign"
      className="py-20 md:py-28 px-6 md:px-10 bg-[var(--color-surface)]/30 border-y border-[var(--color-border-soft)]"
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end mb-12">
          <div>
            <p className="label-eyebrow mb-3">
              {pickLocalized(homeCopy, "campaignEyebrow", locale)}
            </p>
            <h2 className="display-heading font-display text-3xl md:text-5xl text-[var(--color-cream)] leading-tight">
              {pickLocalized(homeCopy, "campaignHeading", locale)}
            </h2>
          </div>
          <div>
            {blurb && (
              <p className="text-sm text-[var(--color-gold-muted)] leading-relaxed mb-4">
                {blurb}
              </p>
            )}
            {note && (
              <p className="text-xs text-[var(--color-gold)] border-l-2 border-[var(--color-gold)] pl-3">
                {note}
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory [scrollbar-width:thin]">
          {rail.products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              className="w-[240px] md:w-[280px] flex-shrink-0 snap-start"
              showPrice={modules.showPrices}
              memberDiscountPercent={rail.memberDiscountPercent}
              memberPricePrefix={pickLocalized(
                homeCopy,
                "campaignMemberPricePrefix",
                locale,
              )}
              badgeLabel={rail.badgeLabel}
              badgeTone="offer"
            />
          ))}
        </div>

        {ctaLabel && (
          <div className="mt-10 text-center">
            <Button
              href={localizeHref(`/collections/${rail.collectionSlug}`, locale)}
              variant="outline"
            >
              {ctaLabel}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
