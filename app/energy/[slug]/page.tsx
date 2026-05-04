import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { listProducts, listServices } from "@/lib/api";
import { buildMetadata } from "@/lib/seo";
import { ELEMENT_BY_SLUG } from "@/data/mock/elements";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { Button } from "@/components/site/shared/button";
import { ProductCard } from "@/components/site/cards/product-card";
import { Badge } from "@/components/site/shared/badge";
import { buildEnquireUrl } from "@/lib/whatsapp";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const services = await listServices().catch(() => []);
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const row = await prisma.service
    .findUnique({
      where: { slug },
      select: {
        name: true,
        summary: true,
        hero: true,
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
    fallbackDescription: row.summary,
    fallbackImage: row.hero,
    path: `/energy/${slug}`,
  });
}

type ServiceElement = "metal" | "earth" | "wood" | "plant" | "water" | "air";

const VALID_ELEMENTS: ServiceElement[] = [
  "metal",
  "earth",
  "wood",
  "plant",
  "water",
  "air",
];

function isServiceElement(v: string): v is ServiceElement {
  return (VALID_ELEMENTS as string[]).includes(v);
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const service = await prisma.service
    .findUnique({ where: { slug } })
    .catch(() => null);
  if (!service) notFound();

  const elementSlug: ServiceElement = isServiceElement(service.element)
    ? service.element
    : "earth";
  const meta = ELEMENT_BY_SLUG[elementSlug];

  const enquireUrl = buildEnquireUrl({ serviceName: service.name });

  // Resolve related product slugs against the public products list (DB).
  const relatedSlugs = service.relatedProductSlugs ?? [];
  let related: Awaited<ReturnType<typeof listProducts>>["products"] = [];
  if (relatedSlugs.length > 0) {
    const all = await listProducts({ limit: 100 }).catch(() => ({
      products: [],
      total: 0,
    }));
    const set = new Set(relatedSlugs);
    related = all.products.filter((p) => set.has(p.slug));
  }

  const whatToExpect = Array.isArray(service.whatToExpect)
    ? (service.whatToExpect as string[])
    : [];

  return (
    <SiteProviders>
      <SiteShell>
        <article
          data-element={elementSlug}
          className="px-6 md:px-10 mx-auto max-w-[1100px]"
        >
          <div className="pt-10 pb-6">
            <Breadcrumbs
              items={[
                { href: "/", label: "Home" },
                { href: "/energy", label: "Energy" },
                { label: service.name },
              ]}
            />
          </div>
          <header className="py-8">
            <Badge tone="element" element={elementSlug} className="mb-4">
              {meta.name} · {service.duration}
            </Badge>
            <h1 className="display-heading font-display text-4xl md:text-6xl text-[var(--color-cream)] leading-tight mb-6">
              {service.name}
            </h1>
            <p className="text-[var(--color-gold-muted)] text-lg max-w-2xl">
              {service.summary}
            </p>
          </header>
          {service.hero && (
            <div className="relative aspect-[16/9] mb-12 border border-[var(--color-border)] overflow-hidden">
              <Image
                src={service.hero}
                alt={service.name}
                fill
                sizes="(max-width: 1100px) 100vw, 1100px"
                priority
                className="object-cover"
              />
            </div>
          )}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="md:col-span-2">
              <h2 className="font-display text-3xl text-[var(--color-cream)] mb-6">
                What to <em className="text-[var(--color-gold)] not-italic">expect</em>
              </h2>
              {whatToExpect.length > 0 ? (
                <ul className="space-y-4 text-[var(--color-cream)] max-w-xl">
                  {whatToExpect.map((line, i) => (
                    <li key={i} className="flex gap-3 leading-relaxed">
                      <span
                        className="text-[var(--color-gold)] flex-shrink-0"
                        aria-hidden
                      >
                        —
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[var(--color-gold-muted)]">
                  We&rsquo;ll walk you through the session over WhatsApp before
                  you arrive.
                </p>
              )}
            </div>
            <aside className="border border-[var(--color-border)] p-6 bg-[var(--color-surface)] h-fit md:sticky md:top-24">
              <p className="label-eyebrow mb-3">Per Session</p>
              <p className="font-display text-2xl text-[var(--color-gold)] mb-6 leading-snug">
                Enquire on WhatsApp
              </p>
              <Button
                href={enquireUrl}
                external
                variant="primary"
                size="lg"
                className="w-full mb-3"
              >
                Book on WhatsApp
              </Button>
              <p className="text-xs text-[var(--color-gold-muted)] leading-relaxed">
                We&apos;ll confirm time, price, location, and intake within the day.
              </p>
            </aside>
          </section>

          {related.length > 0 && (
            <section className="mt-20 border-t border-[var(--color-border)] pt-12">
              <p className="label-eyebrow mb-3">From the same element</p>
              <h2 className="font-display text-3xl text-[var(--color-cream)] mb-8">
                Objects you might like
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {related.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
          <div className="h-20" />
        </article>
      </SiteShell>
    </SiteProviders>
  );
}
