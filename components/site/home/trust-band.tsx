import type { HomeCopy } from "@/lib/site-content";
import { pickLocalized, type Locale } from "@/lib/i18n/locale";
import { accentColor, accentOn, type HomeAccent } from "@/lib/home-accents";

// Trust band (homeTrustBand module) — three short value statements on a solid
// accent-coloured band. `accent` (set in /sysuser/homepage) is the band colour
// itself; text auto-contrasts. Defaults to gold.
export function TrustBand({
  homeCopy,
  locale,
  accent,
}: {
  homeCopy: HomeCopy;
  locale: Locale;
  accent?: HomeAccent;
}) {
  const items = pickLocalized(homeCopy, "trustItems", locale) ?? [];
  if (items.length === 0) return null;

  const bg = accentColor(accent);
  const fg = accentOn(accent);

  return (
    <section style={{ backgroundColor: bg, color: fg }}>
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
