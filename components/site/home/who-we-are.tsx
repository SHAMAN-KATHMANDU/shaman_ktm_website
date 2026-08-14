import { prisma } from "@/lib/db";
import { Button } from "@/components/site/shared/button";
import { showroomFromRow } from "@/lib/api/server/dto";
import type { Showroom } from "@/lib/api/types";
import { pickLocalized, localizeHref, type Locale } from "@/lib/i18n/locale";
import type { HomeCopy } from "@/lib/site-content";
import { accentColor, type HomeAccent } from "@/lib/home-accents";

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
// list, with the passport quote and a WhatsApp note. `accent` (set in
// /sysuser/homepage) colours the eyebrow and passport quote. Defaults to gold.
export async function WhoWeAre({
  homeCopy,
  locale,
  accent,
}: {
  homeCopy: HomeCopy;
  locale: Locale;
  accent?: HomeAccent;
}) {
  const showrooms = await loadShowrooms(locale);
  const paragraphs = pickLocalized(homeCopy, "whoParagraphs", locale) ?? [];
  const passportQuote = pickLocalized(homeCopy, "whoPassportQuote", locale);
  const ctaLabel = pickLocalized(homeCopy, "whoCtaLabel", locale);
  const whatsappNote = pickLocalized(homeCopy, "whoWhatsappNote", locale);
  const accentCss = accentColor(accent);

  return (
    <section
      id="who-we-are"
      className="bg-cream text-ink"
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10 py-20 md:py-28 grid gap-12 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="label-eyebrow mb-3" style={{ color: accentCss }}>
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
            <p
              className="font-display italic text-xl md:text-2xl my-8"
              style={{ color: accentCss }}
            >
              {passportQuote}
            </p>
          )}
          {ctaLabel && (
            <Button href={localizeHref("/pages/about", locale)} variant="outline">
              {ctaLabel}
            </Button>
          )}
        </div>
        <div>
          {showrooms.length > 0 && (
            <ul className="border-t border-line">
              {showrooms.map((s) => (
                <li
                  key={s.key}
                  className="flex items-baseline justify-between gap-4 py-4 border-b border-line"
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
