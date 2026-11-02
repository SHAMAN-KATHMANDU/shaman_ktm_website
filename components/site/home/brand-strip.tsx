import type { HomeCopy } from "@/lib/site-content";
import { pickLocalized, type Locale } from "@/lib/i18n/locale";

export function BrandStrip({ homeCopy, locale }: { homeCopy: HomeCopy; locale: Locale }) {
  const cards = pickLocalized(homeCopy, "brandStripCards", locale) ?? [];
  if (cards.length === 0) return null;

  return (
    <section className="bg-ink">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0">
        {cards.map((p, i) => (
          <div
            key={`${p.title}-${i}`}
            className={`text-center px-6 ${
              i > 0 ? "md:border-l md:border-line" : ""
            }`}
          >
            <h3 className="font-display text-2xl text-cream mb-3">
              {p.title}
            </h3>
            <p className="text-sm text-cream leading-relaxed">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
