import { ELEMENTS } from "@/data/mock/elements";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { ElementCard } from "@/components/site/cards/element-card";

export function ElementsGrid() {
  return (
    <section className="py-20 md:py-28 px-6 md:px-10 bg-[var(--color-surface)]/30">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow="All Categories"
          title={
            <>
              Six elements, <em>one curation</em>
            </>
          }
          className="mb-12"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ELEMENTS.map((el) => (
            <ElementCard key={el.slug} element={el} />
          ))}
        </div>
      </div>
    </section>
  );
}
