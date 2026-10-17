import { notFound } from "next/navigation";
import { listProducts, listCategories } from "@/lib/api";
import { getLocale } from "@/lib/i18n/server";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { ProductCard } from "@/components/site/cards/product-card";
import { JsonLd, buildBreadcrumbList } from "@/components/site/shared/json-ld";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { buildMetadata, siteUrl } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const cats = await listCategories(locale);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) return {};
  const t = getDictionary(locale);
  return buildMetadata({
    fallbackTitle: `${cat.name} — Shaman Kathmandu`,
    fallbackDescription: t.seo.categoryDescription.replace("{name}", cat.name),
    fallbackImage: cat.imageUrl,
    path: locale === "ne" ? `/ne/categories/${slug}` : `/categories/${slug}`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const [cats, t] = await Promise.all([
    listCategories(locale),
    getDictionary(locale),
  ]);
  const cat = cats.find((c) => c.slug === slug);
  if (!cat) notFound();

  const { products, total } = await listProducts({
    categorySlug: slug,
    limit: 48,
  }, locale);

  const pageUrl = `${siteUrl}/categories/${slug}`;
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: t.breadcrumbs.home, url: `${siteUrl}/` },
    { name: t.breadcrumbs.ourProducts, url: `${siteUrl}/products` },
    { name: cat.name, url: pageUrl },
  ]);
  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: cat.name,
    url: pageUrl,
    description: t.seo.categoryDescription.replace("{name}", cat.name),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl}/products/${p.slug}`,
        name: p.name,
      })),
    },
  };

  return (
    <SiteProviders>
      <SiteShell>
        <JsonLd data={breadcrumbJsonLd} />
        <JsonLd data={collectionJsonLd} />
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs
            items={[
              { href: "/", label: t.breadcrumbs.home },
              { href: "/products", label: t.breadcrumbs.ourProducts },
              { label: cat.name },
            ]}
          />
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
          <h1 className="font-display text-4xl md:text-5xl text-ink mb-4">
            {cat.name}
          </h1>
          <p className="label-nav text-[10px] text-ink-soft mb-10">
            {total} {total === 1 ? t.common.object : t.common.objects}
          </p>
          {products.length === 0 ? (
            <p className="py-20 text-center text-ink-soft">
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
