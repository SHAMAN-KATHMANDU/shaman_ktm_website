import { getRelatedProducts } from "@/lib/api";
import { ProductCard } from "@/components/site/cards/product-card";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/getDictionary";

interface Props {
  productSlug: string;
}

export async function RelatedProducts({ productSlug }: Props) {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const summaries = await getRelatedProducts(productSlug, locale).catch(() => []);
  if (summaries.length === 0) return null;

  return (
    <section className="mt-20 border-t border-line pt-16">
      <SectionHeading
        eyebrow={t.product.oftenTogether}
        title={
          <>
            {t.product.frequentlyBoughtWith}
          </>
        }
        className="mb-10"
        align="left"
      />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {summaries.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
