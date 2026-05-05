import { notFound } from "next/navigation";
import { getCollection } from "@/lib/api";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { ProductCard } from "@/components/site/cards/product-card";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const row = await prisma.collection
    .findUnique({
      where: { slug },
      select: {
        title: true,
        subtitle: true,
        heroImageUrl: true,
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
    fallbackTitle: `${row.title} — Shaman Kathmandu`,
    fallbackDescription: row.subtitle,
    fallbackImage: row.heroImageUrl,
    path: `/collections/${slug}`,
  });
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  let collection;
  try {
    collection = await getCollection(slug);
  } catch {
    notFound();
  }
  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs
            items={[
              { href: "/", label: "Home" },
              { label: collection.title },
            ]}
          />
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-12">
          <SectionHeading
            eyebrow="Collection"
            title={collection.title}
            subtitle={collection.subtitle ?? undefined}
            className="mb-12"
          />
          {collection.products.length === 0 ? (
            <p className="py-20 text-center text-[var(--color-gold-muted)]">
              No items in this collection yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {collection.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      </SiteShell>
    </SiteProviders>
  );
}
