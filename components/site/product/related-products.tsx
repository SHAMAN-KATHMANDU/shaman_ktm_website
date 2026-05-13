import { getFrequentlyBoughtWith, listProducts } from "@/lib/api";
import { ProductCard } from "@/components/site/cards/product-card";
import { SectionHeading } from "@/components/site/shared/section-heading";

interface Props {
  productSlug: string;
}

export async function RelatedProducts({ productSlug }: Props) {
  const fbt = await getFrequentlyBoughtWith(productSlug).catch(() => []);
  // FBT returns lightweight items. Resolve to ProductSummary via listProducts.
  const allList = await listProducts({ limit: 100 });
  const idSet = new Set(fbt.map((f) => f.id));
  const summaries = allList.products.filter((p) => idSet.has(p.id));
  if (summaries.length === 0) return null;

  return (
    <section className="mt-20 border-t border-[var(--color-border)] pt-16">
      <SectionHeading
        eyebrow="Often together"
        title={
          <>
            Frequently <em>bought with</em>
          </>
        }
        className="mb-10"
        align="left"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {summaries.slice(0, 4).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
