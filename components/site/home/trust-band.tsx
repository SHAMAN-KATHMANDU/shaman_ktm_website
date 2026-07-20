import type { HomeCopy } from "@/lib/site-content";
import { pickLocalized, type Locale } from "@/lib/i18n/locale";

// Gold trust band (homeTrustBand module) — three short value statements
// (sourced short / priced honest / answered same-day).
export function TrustBand({
  homeCopy,
  locale,
}: {
  homeCopy: HomeCopy;
  locale: Locale;
}) {
  const items = pickLocalized(homeCopy, "trustItems", locale) ?? [];
  if (items.length === 0) return null;

  return (
    <section className="bg-[var(--color-gold)] text-[var(--color-base)]">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-12 md:py-16 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
        {items.map((item, i) => (
          <div key={`${item.title}-${i}`}>
            <h3 className="font-display text-xl md:text-2xl mb-2">
              {item.title}
            </h3>
            <p className="text-sm leading-relaxed opacity-80">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
