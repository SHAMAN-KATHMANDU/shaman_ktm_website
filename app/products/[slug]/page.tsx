import { notFound } from "next/navigation";
import { getProduct, listProducts } from "@/lib/api";
import { ELEMENT_BY_SLUG } from "@/data/mock/elements";
import { getElementOf } from "@/data/mock/products";
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

export async function generateStaticParams() {
  const { products } = await listProducts({ limit: 100 });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const product = await getProduct(slug);
    return {
      title: `${product.name} — Shaman Kathmandu`,
      description: product.description.slice(0, 160),
      openGraph: {
        title: product.name,
        description: product.description.slice(0, 160),
        images: product.images.slice(0, 1),
      },
    };
  } catch {
    return {};
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  let product;
  try {
    product = await getProduct(slug);
  } catch {
    notFound();
  }

  const element = getElementOf(product) as ElementSlug | undefined;
  const elementMeta = element ? ELEMENT_BY_SLUG[element] : undefined;

  return (
    <SiteProviders>
      <SiteShell>
        <article
          data-element={element}
          className="px-6 md:px-10 mx-auto max-w-[1400px]"
        >
          <div className="pt-10 pb-6">
            <Breadcrumbs
              items={[
                { href: "/", label: "Home" },
                { href: "/nature", label: "Nature" },
                element
                  ? { href: `/nature/${element}`, label: elementMeta?.name ?? element }
                  : { label: "Catalog" },
                { label: product.name },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 py-8">
            <ProductGallery
              images={product.images.length ? product.images : [product.thumbnailUrl]}
              alt={product.name}
            />
            <ProductInfo product={product} />
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
