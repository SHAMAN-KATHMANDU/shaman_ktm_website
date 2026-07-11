import { notFound } from "next/navigation";
import { getProduct } from "@/lib/api";
import { getSiteModules } from "@/lib/site-modules";
import { getNavConfig } from "@/lib/site-content";
import { getLocale } from "@/lib/i18n/server";
import { prisma } from "@/lib/db";
import { buildMetadata, siteUrl } from "@/lib/seo";
import { JsonLd, buildBreadcrumbList } from "@/components/site/shared/json-ld";
import { ELEMENT_BY_SLUG } from "@/data/mock/elements";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { ProductDetailView } from "@/components/site/product/product-detail-view";
import { ProductTabs } from "@/components/site/product/product-tabs";
import { RelatedProducts } from "@/components/site/product/related-products";
import { ProductReviews } from "@/components/site/product/product-reviews";
import type { ElementSlug } from "@/lib/api/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const row = await prisma.product
    .findFirst({
      where: { slug, status: "published" },
      select: {
        name: true,
        nameNe: true,
        description: true,
        descriptionNe: true,
        thumbnailUrl: true,
        price: true,
        currency: true,
        priceOnEnquiry: true,
        seoTitle: true,
        seoTitleNe: true,
        seoDescription: true,
        seoDescriptionNe: true,
        ogImageUrl: true,
        canonicalUrl: true,
        noindex: true,
        twitterCard: true,
        variations: { select: { stock: true } },
      },
    })
    .catch(() => null);
  if (!row) return {};
  const pick = (en: string | null, ne: string | null) =>
    locale === "ne" && ne && ne.trim() !== "" ? ne : en;
  const name = pick(row.name, row.nameNe) ?? row.name;
  const description = pick(row.description, row.descriptionNe) ?? row.description;
  return buildMetadata({
    seoTitle: pick(row.seoTitle, row.seoTitleNe),
    seoDescription: pick(row.seoDescription, row.seoDescriptionNe),
    ogImageUrl: row.ogImageUrl,
    canonicalUrl: row.canonicalUrl,
    noindex: row.noindex,
    twitterCard: row.twitterCard,
    fallbackTitle: `${name} — Shaman Kathmandu`,
    fallbackDescription: description.slice(0, 160),
    fallbackImage: row.thumbnailUrl,
    path: locale === "ne" ? `/ne/products/${slug}` : `/products/${slug}`,
    // The page component renders og:type=product + product:* microdata as
    // real property-based meta tags; this only suppresses og:type=website.
    isProduct: true,
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = await (await import("@/lib/i18n/getDictionary")).getDictionary(locale);
  let product;
  try {
    product = await getProduct(slug, locale);
  } catch {
    notFound();
  }

  const primaryElement = product.elementSlugs?.[0] as ElementSlug | undefined;
  const elementMeta = primaryElement ? ELEMENT_BY_SLUG[primaryElement] : undefined;
  const [modules, nav] = await Promise.all([
    getSiteModules(),
    getNavConfig(),
  ]);

  // Reconciled availability: variant products aggregate variant stock;
  // variation-less products fall back to product-level stockQuantity (null =
  // untracked → available).
  const inStock =
    product.variations.length > 0
      ? product.variations.reduce((sum, v) => sum + v.stock, 0) > 0
      : product.stockQuantity == null || product.stockQuantity > 0;

  // schema.org dimension fields (QuantitativeValue), included only when present.
  const d = product.dimensions;
  const qv = (value: number | null | undefined, unitText: string) =>
    value != null
      ? { "@type": "QuantitativeValue", value, unitText }
      : undefined;
  const dimensionLd = d
    ? {
        height: qv(d.height, d.unit),
        width: qv(d.width, d.unit),
        depth: qv(d.length, d.unit),
        weight: qv(d.weight, d.weightUnit),
      }
    : {};

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description.slice(0, 500),
    image: product.images.length ? product.images : [product.thumbnailUrl],
    sku: product.variations[0]?.sku,
    category: product.category?.name,
    ...dimensionLd,
    offers: product.priceOnEnquiry
      ? undefined
      : {
          "@type": "Offer",
          priceCurrency: product.currency,
          price: product.price,
          availability: inStock
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          url: `${siteUrl}/products/${product.slug}`,
        },
  };
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: t.breadcrumbs.home, url: `${siteUrl}/` },
    { name: t.breadcrumbs.nature, url: `${siteUrl}/nature` },
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
    <>
      {/* Open Graph product microdata for Meta — property-based (Facebook
          ignores name=-based og tags). retailer_item_id = slug matches the
          pixel content_ids and the feed <g:id>. React 19 hoists these to
          <head>. */}
      <meta property="og:type" content="product" />
      <meta property="product:retailer_item_id" content={product.slug} />
      <meta property="product:brand" content="Shaman Kathmandu" />
      <meta
        property="product:availability"
        content={inStock ? "in stock" : "out of stock"}
      />
      {!product.priceOnEnquiry && (
        <>
          <meta
            property="product:price:amount"
            content={String(product.price)}
          />
          <meta
            property="product:price:currency"
            content={product.currency}
          />
        </>
      )}
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
                { href: "/", label: t.breadcrumbs.home },
                { href: "/nature", label: t.breadcrumbs.nature },
                primaryElement
                  ? {
                      href: `/nature/${primaryElement}`,
                      label: elementMeta?.name ?? primaryElement,
                    }
                  : { label: t.breadcrumbs.catalog },
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
          <ProductDetailView
            product={product}
            images={
              product.images.length ? product.images : [product.thumbnailUrl]
            }
            showPrices={modules.showPrices}
            cartEnabled={modules.cart}
            enquireLabel={nav.ctaProductEnquireLabel}
          />
          <ProductTabs description={product.description} />
          <RelatedProducts productSlug={product.slug} />
          <ProductReviews productSlug={product.slug} />
          <div className="h-20" />
        </article>
      </SiteShell>
    </SiteProviders>
    </>
  );
}
