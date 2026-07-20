import { prisma } from "@/lib/db";
import { Button } from "@/components/site/shared/button";
import { showroomFromRow } from "@/lib/api/server/dto";
import type { Showroom } from "@/lib/api/types";
import { pickLocalized, localizeHref, type Locale } from "@/lib/i18n/locale";
import type { HomeCopy } from "@/lib/site-content";

async function loadShowrooms(locale: Locale): Promise<Showroom[]> {
  try {
    const rows = await prisma.showroom.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    return rows.map((r) => showroomFromRow(r, locale));
  } catch {
    return [];
  }
}

// "Who we are" block (homeWhoWeAre module): story copy beside the showroom
// list, with the passport quote and a WhatsApp note.
export async function WhoWeAre({
  homeCopy,
  locale,
}: {
  homeCopy: HomeCopy;
  locale: Locale;
}) {
  const showrooms = await loadShowrooms(locale);
  const paragraphs = pickLocalized(homeCopy, "whoParagraphs", locale) ?? [];
  const passportQuote = pickLocalized(homeCopy, "whoPassportQuote", locale);
  const ctaLabel = pickLocalized(homeCopy, "whoCtaLabel", locale);
  const whatsappNote = pickLocalized(homeCopy, "whoWhatsappNote", locale);

  return (
    <section
      id="who-we-are"
      className="bg-[var(--color-cream)] text-[var(--color-base)]"
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-28 grid gap-12 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="label-eyebrow !text-[var(--color-surface)] opacity-70 mb-3">
            {pickLocalized(homeCopy, "whoEyebrow", locale)}
          </p>
          <h2 className="display-heading font-display text-3xl md:text-5xl leading-tight mb-6">
            {pickLocalized(homeCopy, "whoHeading", locale)}
          </h2>
          {paragraphs.map((p, i) => (
            <p
              key={i}
              className="text-base md:text-lg leading-relaxed opacity-80 mb-4 max-w-2xl"
            >
              {p}
            </p>
          ))}
          {passportQuote && (
            <p className="font-display italic text-xl md:text-2xl my-8">
              {passportQuote}
            </p>
          )}
          {ctaLabel && (
            <Button href={localizeHref("/pages/about", locale)} variant="outline-dark">
              {ctaLabel}
            </Button>
          )}
        </div>
        <div>
          {showrooms.length > 0 && (
            <ul className="border-t border-[var(--color-base)]/20">
              {showrooms.map((s) => (
                <li
                  key={s.key}
                  className="flex items-baseline justify-between gap-4 py-4 border-b border-[var(--color-base)]/20"
                >
                  <h4 className="font-display text-xl">{s.name}</h4>
                  <span className="label-nav text-[11px] opacity-60 text-right">
                    {s.address}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {whatsappNote && (
            <p className="mt-6 text-sm opacity-70">{whatsappNote}</p>
          )}
        </div>
      </div>
    </section>
  );
}
