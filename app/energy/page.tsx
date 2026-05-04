import { listServices } from "@/lib/api";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { ServiceCard } from "@/components/site/cards/service-card";

export const metadata = {
  title: "Energy Services — Shaman Kathmandu",
  description:
    "Sound healing, breath work, and slow guided practice. Booked over WhatsApp.",
};

export const revalidate = 60;

export default async function EnergyPage() {
  const services = await listServices().catch(() => []);
  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Energy" }]} />
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
          <SectionHeading
            eyebrow="Energy Services"
            title={
              <>
                Sit, breathe, <em>be sound</em>
              </>
            }
            subtitle="Sessions across the elements. All bookings happen on WhatsApp — we'll confirm a time within the day."
            className="mb-12"
          />
          {services.length === 0 ? (
            <p className="py-20 text-center text-[var(--color-gold-muted)]">
              No energy services scheduled right now. WhatsApp us to enquire.
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
