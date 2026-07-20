import { listBundles } from "@/lib/api";
import { getLocale } from "@/lib/i18n/server";
import { pickLocalized } from "@/lib/i18n/locale";
import { getHomeCopy } from "@/lib/site-content";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { BundleCard } from "@/components/site/cards/bundle-card";

export const metadata = {
  title: "Bundles — Shaman Kathmandu",
  description: "Curated sets across the elements.",
};

export default async function BundlesPage() {
  const locale = await getLocale();
  const [bundles, t, homeCopy] = await Promise.all([
    listBundles(locale),
    (await import("@/lib/i18n/getDictionary")).getDictionary(locale),
    getHomeCopy(),
  ]);
  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs items={[{ href: "/", label: t.breadcrumbs.home }, { label: t.breadcrumbs.bundles }]} />
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
          <SectionHeading
            eyebrow={pickLocalized(homeCopy, "bundlesPageEyebrow", locale)}
            title={pickLocalized(homeCopy, "bundlesPageHeading", locale)}
            subtitle={pickLocalized(homeCopy, "bundlesPageSubheading", locale)}
            className="mb-12"
          />
          {bundles.length === 0 ? (
            <p className="py-20 text-center text-[var(--color-gold-muted)]">
              {t.emptyStates.noBundlesPublished}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {bundles.map((b) => (
                <BundleCard key={b.id} bundle={b} />
              ))}
            </div>
          )}
        </section>
      </SiteShell>
    </SiteProviders>
  );
}
