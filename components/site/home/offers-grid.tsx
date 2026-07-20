import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { getOffersCards } from "@/lib/api/server/homepage";
import { pickLocalized, localizeHref, type Locale } from "@/lib/i18n/locale";
import type { HomeCopy } from "@/lib/site-content";
import { accentColor, type HomeAccent } from "@/lib/home-accents";

// "The offers" band (homeOffers module): a grid of collection teasers and
// text-only promo cards configured in /sysuser/homepage → Offers grid.
// `accent` (set in /sysuser/homepage) colours the chip labels and CTA arrows.
export async function OffersGrid({
  homeCopy,
  locale,
  accent,
}: {
  homeCopy: HomeCopy;
  locale: Locale;
  accent?: HomeAccent;
}) {
  const cards = await getOffersCards(locale);
  if (cards.length === 0) return null;

  const accentCss = accentColor(accent);

  const gridCols =
    cards.length >= 4
      ? "lg:grid-cols-4"
      : cards.length === 3
        ? "lg:grid-cols-3"
        : "lg:grid-cols-2";

  return (
    <section id="offers" className="py-20 md:py-28 px-6 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={pickLocalized(homeCopy, "offersEyebrow", locale)}
          title={pickLocalized(homeCopy, "offersHeading", locale)}
          className="mb-12"
        />
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${gridCols} gap-5`}>
          {cards.map((card, i) => (
            <Link
              key={`${card.heading}-${i}`}
              href={localizeHref(card.ctaHref, locale)}
              className="group flex flex-col bg-[var(--color-surface)] border border-[var(--color-border-soft)] hover:border-[var(--color-gold)] transition-all hover:-translate-y-1"
            >
              {card.imageUrl ? (
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-2)]">
                  <Image
                    src={card.imageUrl}
                    alt={card.heading}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 350px"
                    loading="lazy"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              ) : null}
              <div
                className={`flex flex-1 flex-col gap-3 p-6 ${
                  card.imageUrl ? "" : "justify-center text-center py-12"
                }`}
              >
                {card.chipLabel && (
                  <span
                    className={`label-nav text-[10px] border px-2.5 py-1 ${
                      card.imageUrl ? "self-start" : "self-center"
                    }`}
                    style={{ color: accentCss, borderColor: accentCss }}
                  >
                    {card.chipLabel}
                  </span>
                )}
                <h3 className="font-display text-2xl text-[var(--color-cream)]">
                  {card.heading}
                </h3>
                <p className="text-sm text-[var(--color-gold-muted)] leading-relaxed flex-1">
                  {card.blurb}
                </p>
                <span className="label-nav text-[11px]" style={{ color: accentCss }}>
                  {card.ctaLabel} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
