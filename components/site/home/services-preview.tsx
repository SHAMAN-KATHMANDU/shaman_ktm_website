import { mockServices } from "@/data/mock/services";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { Button } from "@/components/site/shared/button";
import { ServiceCard } from "@/components/site/cards/service-card";
import type { NavConfig } from "@/lib/site-content";

export function ServicesPreview({ nav }: { nav: NavConfig }) {
  const featured = mockServices.slice(0, 3);
  return (
    <section className="py-20 md:py-28 px-6 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow="Energy Services"
          title={
            <>
              Sit, breathe, <em>be sound</em>
            </>
          }
          subtitle="Sound healing, breath work, and slow guided practice — at our showrooms or above the city in the pine."
          className="mb-12"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {featured.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
        {nav.servicesAllCta.label && (
          <div className="mt-12 text-center">
            <Button
              href={nav.servicesAllCta.href}
              external={nav.servicesAllCta.external}
              variant="outline"
            >
              {nav.servicesAllCta.label}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
