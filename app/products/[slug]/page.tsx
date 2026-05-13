import { notFound } from "next/navigation";
import { getProduct } from "@/lib/api";
import { getSiteModules } from "@/lib/site-modules";
import { getNavConfig } from "@/lib/site-content";
import { prisma } from "@/lib/db";
import { buildMetadata, siteUrl } from "@/lib/seo";
import { JsonLd, buildBreadcrumbList } from "@/components/site/shared/json-ld";
import { ELEMENT_BY_SLUG } from "@/data/mock/elements";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { ProductGallery } from "@/components/site/product/product-gallery";
import { ProductInfo } from "@/components/site/product/product-info";
import { ProductTabs } from "@/components/site/product/product-tabs";
import { RelatedProducts } from "@/components/site/product/related-products";
import { ProductReviews } from "@/components/site/product/product-reviews";
import type { ElementSlug } from "@/lib/api/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const row = await prisma.product
    .findUnique({
      where: { slug },
      select: {
        name: true,
        description: true,
        thumbnailUrl: true,
        seoTitle: true,
        seoDescription: true,
        ogImageUrl: true,
        canonicalUrl: true,
        noindex: true,
        twitterCard: true,
      },
    })
    .catch(() => null);
  if (!row) return {};
  return buildMetadata({
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    ogImageUrl: row.ogImageUrl,
    canonicalUrl: row.canonicalUrl,
    noindex: row.noindex,
    twitterCard: row.twitterCard,
    fallbackTitle: `${row.name} — Shaman Kathmandu`,
    fallbackDescription: row.description.slice(0, 160),
    fallbackImage: row.thumbnailUrl,
    path: `/products/${slug}`,
    ogType: "website",
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  let product;
  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }

  const primaryElement = product.elementSlugs?.[0] as ElementSlug | undefined;
  const elementMeta = primaryElement ? ELEMENT_BY_SLUG[primaryElement] : undefined;
  const [modules, nav] = await Promise.all([
    getSiteModules(),
    getNavConfig(),
  ]);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description.slice(0, 500),
    image: product.images.length ? product.images : [product.thumbnailUrl],
    sku: product.variations[0]?.sku,
    category: product.category?.name,
    offers: product.priceOnEnquiry
      ? undefined
      : {
          "@type": "Offer",
          priceCurrency: product.currency,
          price: product.price,
          availability:
            (product.variations[0]?.stock ?? 1) > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          url: `${siteUrl}/products/${product.slug}`,
        },
  };
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Nature", url: `${siteUrl}/nature` },
    ...(primaryElement && elementMeta
      ? [
          {
            name: elementMeta.name,
            url: `${siteUrl}/nature/${primaryElement}`,
          },
        ]
      : []),
    ...(product.category?.slug && product.category.name
      ? [
          {
            name: product.category.name,
            url: `${siteUrl}/categories/${product.category.slug}`,
          },
        ]
      : []),
    { name: product.name, url: `${siteUrl}/products/${product.slug}` },
  ]);

  return (
    <SiteProviders>
      <SiteShell>
        <JsonLd data={productJsonLd} />
        <JsonLd data={breadcrumbJsonLd} />
        <article
          data-element={primaryElement}
          className="px-6 md:px-10 mx-auto max-w-[1400px]"
        >
          <div className="pt-10 pb-6">
            <Breadcrumbs
              items={[
                { href: "/", label: "Home" },
                { href: "/nature", label: "Nature" },
                primaryElement
                  ? {
                      href: `/nature/${primaryElement}`,
                      label: elementMeta?.name ?? primaryElement,
                    }
                  : { label: "Catalog" },
                ...(product.category?.slug && product.category.name
                  ? [
                      {
                        href: `/categories/${product.category.slug}`,
                        label: product.category.name,
                      },
                    ]
                  : []),
                { label: product.name },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 py-8">
            <ProductGallery
              images={product.images.length ? product.images : [product.thumbnailUrl]}
              alt={product.name}
            />
            <ProductInfo
              product={product}
              showPrices={modules.showPrices}
              enquireLabel={nav.ctaProductEnquireLabel}
            />
          </div>
          <ProductTabs description={product.description} />
          <RelatedProducts productSlug={product.slug} />
          <ProductReviews productSlug={product.slug} />
          <div className="h-20" />
        </article>
      </SiteShell>
    </SiteProviders>
  );
}
