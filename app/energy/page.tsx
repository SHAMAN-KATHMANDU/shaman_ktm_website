import { listServices } from "@/lib/api";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized } from "@/lib/i18n/locale";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { ServiceCard } from "@/components/site/cards/service-card";
import { getHomeCopy } from "@/lib/site-content";

export const metadata = {
  title: "Energy Services — Shaman Kathmandu",
  description:
    "Sound healing, breath work, and slow guided practice. Booked over WhatsApp.",
};

export default async function EnergyPage() {
  const locale = await getLocale();
  const [services, homeCopy, t] = await Promise.all([
    listServices(locale).catch(() => []),
    getHomeCopy(),
    (await import("@/lib/i18n/getDictionary")).getDictionary(locale),
  ]);
  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs items={[{ href: "/", label: t.breadcrumbs.home }, { label: t.breadcrumbs.energy }]} />
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
          <SectionHeading
            eyebrow={pickLocalized(homeCopy, "energyPageEyebrow", locale)}
            title={pickLocalized(homeCopy, "energyPageHeading", locale)}
            subtitle={pickLocalized(homeCopy, "energyPageSubheading", locale) || undefined}
            className="mb-12"
          />
          {services.length === 0 ? (
            <p className="py-20 text-center text-[var(--color-gold-muted)]">
              {pickLocalized(homeCopy, "energyPageEmptyState", locale)}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {services.map((s) => (
                <ServiceCard key={s.slug} service={s} />
              ))}
            </div>
          )}
        </section>
      </SiteShell>
    </SiteProviders>
  );
}
