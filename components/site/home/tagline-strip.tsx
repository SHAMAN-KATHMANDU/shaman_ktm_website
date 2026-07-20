import type { HomeCopy } from "@/lib/site-content";
import { pickLocalized, type Locale } from "@/lib/i18n/locale";

// Full-width quote band under the hero — the cream interlude between the
// dark hero and the category tiles (homeTagline module).
export function TaglineStrip({
  homeCopy,
  locale,
}: {
  homeCopy: HomeCopy;
  locale: Locale;
}) {
  const quote = pickLocalized(homeCopy, "taglineQuote", locale);
  if (!quote) return null;
  const subline = pickLocalized(homeCopy, "taglineSubline", locale);

  return (
    <section className="bg-[var(--color-cream)] text-[var(--color-base)]">
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-16 md:py-24 text-center">
        <h2 className="font-display italic text-2xl md:text-4xl lg:text-5xl max-w-3xl mx-auto leading-snug">
          &ldquo;{quote}&rdquo;
        </h2>
        {subline && (
          <p className="mt-5 label-eyebrow !text-[var(--color-surface)] opacity-70">
            {subline}
          </p>
        )}
      </div>
    </section>
  );
}
