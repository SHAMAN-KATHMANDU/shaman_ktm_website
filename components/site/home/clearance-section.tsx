import { ProductCard } from "@/components/site/cards/product-card";
import { getClearanceSection } from "@/lib/api/server/homepage";
import { getSiteModules } from "@/lib/site-modules";
import { pickLocalized, type Locale } from "@/lib/i18n/locale";
import type { HomeCopy } from "@/lib/site-content";

// Clearance band (homeClearance module): a final-sale banner with the big
// "up to X% off" number and the configured collection's products.
export async function ClearanceSection({
  homeCopy,
  locale,
}: {
  homeCopy: HomeCopy;
  locale: Locale;
}) {
  const [clearance, modules] = await Promise.all([
    getClearanceSection(locale),
    getSiteModules(),
  ]);
  if (!clearance) return null;

  const note = pickLocalized(homeCopy, "clearanceNote", locale);

  return (
    <section id="clearance" className="py-20 md:py-28 px-6 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center border border-[var(--color-border)] bg-[var(--color-surface)]/50 p-8 md:p-12 mb-12">
          <div>
            <p className="label-eyebrow !text-[var(--color-danger)] mb-3">
              {pickLocalized(homeCopy, "clearanceEyebrow", locale)}
            </p>
            <h2 className="display-heading font-display text-3xl md:text-5xl text-[var(--color-cream)] leading-tight">
              {pickLocalized(homeCopy, "clearanceHeading", locale)}
            </h2>
            <p className="mt-4 text-sm text-[var(--color-gold-muted)] max-w-xl leading-relaxed">
              {pickLocalized(homeCopy, "clearanceBlurb", locale)}
            </p>
          </div>
          <div className="font-display text-[var(--color-danger)] text-6xl md:text-8xl leading-none whitespace-nowrap">
            <span className="block label-nav text-[11px] text-[var(--color-gold-muted)] mb-2">
              {pickLocalized(homeCopy, "clearancePercentPrefix", locale)}
            </span>
            {clearance.percentLabel}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {clearance.products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              showPrice={modules.showPrices}
              badgeLabel={clearance.badgeLabel}
              badgeTone="final"
            />
          ))}
        </div>

        {note && (
          <p className="mt-8 text-center text-xs text-[var(--color-gold-muted)]">
            — {note} —
          </p>
        )}
      </div>
    </section>
  );
}
