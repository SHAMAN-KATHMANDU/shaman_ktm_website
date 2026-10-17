import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/db";
import { listProducts } from "@/lib/api";
import { getLocale } from "@/lib/i18n/server";
import { localizeHref, pickLocalized } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { buildMetadata, metaDescription, siteUrl } from "@/lib/seo";
import { JsonLd, buildBreadcrumbList } from "@/components/site/shared/json-ld";
import { serviceJsonLd } from "@/lib/structured-data";
import { ELEMENT_BY_SLUG } from "@/data/mock/elements";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { Button } from "@/components/site/shared/button";
import { ProductCard } from "@/components/site/cards/product-card";
import { Badge } from "@/components/site/shared/badge";
import { buildEnquireUrl } from "@/lib/whatsapp";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();
  const row = await prisma.service
    .findUnique({
      where: { slug },
      select: {
        name: true,
        nameNe: true,
        summary: true,
        summaryNe: true,
        hero: true,
        seoTitle: true,
        seoTitleNe: true,
        seoDescription: true,
        seoDescriptionNe: true,
        ogImageUrl: true,
        canonicalUrl: true,
        noindex: true,
        twitterCard: true,
      },
    })
    .catch(() => null);
  if (!row) return {};
  const pick = (en: string | null, ne: string | null) =>
    locale === "ne" && ne && ne.trim() !== "" ? ne : en;
  const name = pick(row.name, row.nameNe) ?? row.name;
  const t = getDictionary(locale);
  return buildMetadata({
    seoTitle: pick(row.seoTitle, row.seoTitleNe),
    seoDescription: pick(row.seoDescription, row.seoDescriptionNe),
    ogImageUrl: row.ogImageUrl,
    canonicalUrl: row.canonicalUrl,
    noindex: row.noindex,
    twitterCard: row.twitterCard,
    fallbackTitle: t.seo.service.title.replaceAll("{name}", name),
    fallbackDescription: metaDescription(pick(row.summary, row.summaryNe)),
    fallbackImage: row.hero,
    path: localizeHref(`/energy/${slug}`, locale),
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
  const locale = await getLocale();
  const t = await (await import("@/lib/i18n/getDictionary")).getDictionary(locale);
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
    const all = await listProducts({ limit: 100 }, locale).catch(() => ({
      products: [],
      total: 0,
    }));
    const set = new Set(relatedSlugs);
    related = all.products.filter((p) => set.has(p.slug));
  }

  const whatToExpect = Array.isArray(service.whatToExpect)
    ? (service.whatToExpect as string[])
    : [];

  const url = `${siteUrl}${localizeHref(`/energy/${slug}`, locale)}`;
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: t.breadcrumbs.home, url: `${siteUrl}/` },
    { name: t.breadcrumbs.energy, url: `${siteUrl}/energy` },
    { name: service.name, url },
  ]);

  return (
    <SiteProviders>
      <SiteShell>
        <JsonLd data={[serviceJsonLd(service, url), breadcrumbJsonLd]} />
        <article
          data-element={elementSlug}
          className="px-6 md:px-10 mx-auto max-w-[1100px]"
        >
          <div className="pt-10 pb-6">
            <Breadcrumbs
              items={[
                { href: "/", label: t.breadcrumbs.home },
                { href: "/energy", label: t.breadcrumbs.energy },
                { label: service.name },
              ]}
            />
          </div>
          <header className="py-8">
            <Badge tone="element" element={elementSlug} className="mb-4">
              {pickLocalized(meta, "name", locale)} · {service.duration}
            </Badge>
            <h1 className="display-heading font-display text-4xl md:text-6xl text-ink leading-tight mb-6">
              {service.name}
            </h1>
            <p className="text-ink-soft text-lg max-w-2xl">
              {service.summary}
            </p>
          </header>
          {service.hero && (
            <div className="relative aspect-[16/9] mb-12 border border-line overflow-hidden">
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
              <h2 className="font-display text-3xl text-ink mb-6">
                {t.services.whatToExpect}
              </h2>
              {whatToExpect.length > 0 ? (
                <ul className="space-y-4 text-ink max-w-xl">
                  {whatToExpect.map((line, i) => (
                    <li key={i} className="flex gap-3 leading-relaxed">
                      <span
                        className="text-metal-text flex-shrink-0"
                        aria-hidden
                      >
                        —
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink-soft">
                  {t.services.enquiryFallback}
                </p>
              )}
            </div>
            <aside className="border border-line p-6 bg-surface h-fit md:sticky md:top-24">
              <p className="label-eyebrow mb-3">{t.services.perSession}</p>
              <p className="font-display text-2xl text-metal-text mb-6 leading-snug">
                {t.product.enquireOnWhatsapp}
              </p>
              <Button
                href={enquireUrl}
                external
                variant="rakta"
                size="lg"
                className="w-full mb-3"
              >
                {t.services.bookOnWhatsapp}
              </Button>
              <p className="text-xs text-ink-soft leading-relaxed">
                {t.services.confirmationNote}
              </p>
            </aside>
          </section>

          {related.length > 0 && (
            <section className="mt-20 border-t border-line pt-12">
              <p className="label-eyebrow mb-3">{t.services.fromSameElement}</p>
              <h2 className="font-display text-3xl text-ink mb-8">
                {t.services.objectsYouMightLike}
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
