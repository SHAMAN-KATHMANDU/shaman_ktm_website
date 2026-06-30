import { listElementsLive } from "@/lib/api/server/elements";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized } from "@/lib/i18n/locale";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { ElementCard } from "@/components/site/cards/element-card";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { getHomeCopy } from "@/lib/site-content";

export const metadata = {
  title: "Nature — Six Elements | Shaman Kathmandu",
  description:
    "Browse the six elements: Metal, Earth, Wood, Plant, Water, Air.",
};

export default async function NaturePage() {
  const locale = await getLocale();
  const [elements, homeCopy, t] = await Promise.all([
    listElementsLive(),
    getHomeCopy(),
    (await import("@/lib/i18n/getDictionary")).getDictionary(locale),
  ]);
  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs items={[{ href: "/", label: t.breadcrumbs.home }, { label: t.breadcrumbs.nature }]} />
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
          <SectionHeading
            eyebrow={pickLocalized(homeCopy, "naturePageEyebrow", locale)}
            title={pickLocalized(homeCopy, "naturePageHeading", locale)}
            subtitle={pickLocalized(homeCopy, "naturePageSubheading", locale) || undefined}
            className="mb-12"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {elements.map((el) => (
              <ElementCard key={el.slug} element={el} />
            ))}
          </div>
        </section>
      </SiteShell>
    </SiteProviders>
  );
}
