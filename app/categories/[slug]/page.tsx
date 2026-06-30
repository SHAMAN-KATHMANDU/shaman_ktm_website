import { notFound } from "next/navigation";
import { listProducts, listCategories } from "@/lib/api";
import { getLocale } from "@/lib/i18n/server";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { ProductCard } from "@/components/site/cards/product-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const cats = await listCategories(locale);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return {};
  return {
    title: `${cat.name} — Shaman Kathmandu`,
    description: `Browse ${cat.name} in the Shaman Kathmandu catalog.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const [cats, t] = await Promise.all([
    listCategories(locale),
    (await import("@/lib/i18n/getDictionary")).getDictionary(locale),
  ]);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) notFound();

  const { products, total } = await listProducts({
    categorySlug: slug,
    limit: 48,
  }, locale);

  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs
            items={[
              { href: "/", label: t.breadcrumbs.home },
              { href: "/nature", label: t.breadcrumbs.nature },
              { label: cat.name },
            ]}
          />
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
          <h1 className="font-display text-4xl md:text-5xl text-[var(--color-cream)] mb-4">
            {cat.name}
          </h1>
          <p className="label-nav text-[10px] text-[var(--color-gold-muted)] mb-10">
            {total} {total === 1 ? t.common.object : t.common.objects}
          </p>
          {products.length === 0 ? (
            <p className="py-20 text-center text-[var(--color-gold-muted)]">
              {t.emptyStates.noProductsInCategory}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </SiteShell>
    </SiteProviders>
  );
}
