import { listElementsLive } from "@/lib/api/server/elements";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { ElementCard } from "@/components/site/cards/element-card";
import { pickLocalized, type Locale } from "@/lib/i18n/locale";
import type { HomeCopy } from "@/lib/site-content";

export async function ElementsGrid({ homeCopy, locale }: { homeCopy: HomeCopy; locale: Locale }) {
  const elements = await listElementsLive();
  return (
    <section className="py-20 md:py-28 px-6 md:px-10 bg-[var(--color-surface)]/30">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={pickLocalized(homeCopy, "naturePageEyebrow", locale)}
          title={pickLocalized(homeCopy, "elementsHeading", locale)}
          subtitle={pickLocalized(homeCopy, "elementsSubheading", locale) || undefined}
          className="mb-12"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {elements.map((el) => (
            <ElementCard key={el.slug} element={el} />
          ))}
        </div>
      </div>
    </section>
  );
}
