import { ELEMENTS } from "@/data/mock/elements";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { ElementCard } from "@/components/site/cards/element-card";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";

export const metadata = {
  title: "Nature — Six Elements | Shaman Kathmandu",
  description:
    "Browse the six elements: Metal, Earth, Wood, Plant, Water, Air.",
};

export default function NaturePage() {
  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Nature" }]} />
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
          <SectionHeading
            eyebrow="Nature + Energy"
            title={
              <>
                Six elements, <em>one curation</em>
              </>
            }
            subtitle="Pick an element to see what's been made, gathered, or distilled out of it. Every object on the site lives under one of these."
            className="mb-12"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ELEMENTS.map((el) => (
              <ElementCard key={el.slug} element={el} />
            ))}
          </div>
        </section>
      </SiteShell>
    </SiteProviders>
  );
}
