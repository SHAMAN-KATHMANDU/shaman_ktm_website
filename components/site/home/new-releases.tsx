import { listProducts } from "@/lib/api";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { Button } from "@/components/site/shared/button";
import { ProductCard } from "@/components/site/cards/product-card";

export async function NewReleases() {
  const { products } = await listProducts({ sort: "newest", limit: 8 });
  return (
    <section className="py-20 md:py-28 px-6 md:px-10 bg-[var(--color-surface)]/30">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow="New Releases"
          title={
            <>
              Newly arrived <em>this season</em>
            </>
          }
          className="mb-12"
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <Button href="/nature" variant="outline">
            Browse All Nature
          </Button>
        </div>
      </div>
    </section>
  );
}
