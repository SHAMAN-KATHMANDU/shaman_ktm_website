import { listBundles } from "@/lib/api";
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
  const bundles = await listBundles();
  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Bundles" }]} />
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
          <SectionHeading
            eyebrow="Bundles"
            title={
              <>
                Three or more, <em>at the same time</em>
              </>
            }
            subtitle="Curated sets across the elements — each one priced below the sum of its parts."
            className="mb-12"
          />
          {bundles.length === 0 ? (
            <p className="py-20 text-center text-[var(--color-gold-muted)]">
              No bundles published yet. Check back soon.
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
