import type { HomeCopy } from "@/lib/site-content";
import type { Locale } from "@/lib/i18n/locale";

export function BrandStrip({ homeCopy, locale }: { homeCopy: HomeCopy; locale: Locale }) {
  const cards = homeCopy.brandStripCards ?? [];
  if (cards.length === 0) return null;

  return (
    <section className="bg-[var(--color-surface)] border-y border-[var(--color-border)]">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0">
        {cards.map((p, i) => (
          <div
            key={`${p.title}-${i}`}
            className={`text-center px-6 ${
              i > 0 ? "md:border-l md:border-[var(--color-border-soft)]" : ""
            }`}
          >
            <h3 className="font-display text-2xl text-[var(--color-gold)] mb-3">
              {p.title}
            </h3>
            <p className="text-sm text-[var(--color-gold-muted)] leading-relaxed">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
