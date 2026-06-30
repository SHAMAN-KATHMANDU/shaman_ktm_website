import { notFound } from "next/navigation";
import { getBundle } from "@/lib/api";
import { getLocale } from "@/lib/i18n/server";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { Markdown } from "@/components/site/blog/markdown";
import { Button } from "@/components/site/shared/button";
import { buildEnquireUrl } from "@/lib/whatsapp";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const row = await prisma.bundle
    .findUnique({
      where: { slug },
      select: {
        title: true,
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
    fallbackTitle: `${row.title} — Shaman Kathmandu`,
    fallbackDescription: row.description?.slice(0, 160) ?? null,
    fallbackImage: row.thumbnailUrl,
    path: locale === "ne" ? `/ne/bundles/${slug}` : `/bundles/${slug}`,
  });
}

export default async function BundlePage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  let bundle;
  try {
    bundle = await getBundle(slug, locale);
  } catch {
    notFound();
  }
  return (
    <SiteProviders>
      <SiteShell>
        <article className="px-6 md:px-10 mx-auto max-w-[1100px]">
          <div className="pt-10 pb-6">
            <Breadcrumbs
              items={[
                { href: "/", label: "Home" },
                { href: "/bundles", label: "Bundles" },
                { label: bundle.title },
              ]}
            />
          </div>
          <header className="py-8">
            <p className="label-eyebrow mb-3">Bundle · {bundle.items.length} pieces</p>
            <h1 className="display-heading font-display text-4xl md:text-6xl text-[var(--color-cream)] leading-tight mb-6">
              {bundle.title}
            </h1>
            <div className="flex items-baseline gap-4 mb-6">
              <span className="text-2xl text-[var(--color-gold)]">
                Enquire on WhatsApp
              </span>
            </div>
          </header>
          <Markdown source={bundle.description} />

          <section className="mt-12">
            <h2 className="font-display text-3xl text-[var(--color-cream)] mb-6">
              What&apos;s <em className="text-[var(--color-gold)] not-italic">inside</em>
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bundle.items.map((item) => (
                <li
                  key={item.productId}
                  className="border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex gap-4 items-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.thumbnailUrl}
                    alt={item.name}
                    className="w-16 h-20 object-cover flex-shrink-0"
                  />
                  <div>
                    <p className="font-display text-base text-[var(--color-cream)] leading-tight">
                      {item.name}
                    </p>
                    <p className="text-xs text-[var(--color-gold-muted)] mt-1">
                      Qty {item.quantity}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-12 pb-20 text-center">
            <Button
              href={buildEnquireUrl({ message: `Hi, I'd like to enquire about the ${bundle.title} bundle.` })}
              external
              variant="primary"
              size="lg"
            >
              Enquire on WhatsApp
            </Button>
            <p className="mt-4 text-xs text-[var(--color-gold-muted)]">
              We&apos;ll respond with availability, price, and pickup or shipping details.
            </p>
          </div>
        </article>
      </SiteShell>
    </SiteProviders>
  );
}
