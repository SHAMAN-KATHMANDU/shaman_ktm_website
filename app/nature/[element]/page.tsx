import { notFound } from "next/navigation";
import { listProducts } from "@/lib/api";
import { getLocale } from "@/lib/i18n/server";
import { getElementLive } from "@/lib/api/server/elements";
import { getCuratedElementSpotlight } from "@/lib/api/server/homepage";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { ProductCard } from "@/components/site/cards/product-card";
import { ElementListing } from "./element-listing";
import { prisma } from "@/lib/db";

async function getPriceTiers() {
  try {
    const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const tiers = (row?.data as { priceFilterTiers?: unknown } | null | undefined)
      ?.priceFilterTiers;
    if (!Array.isArray(tiers)) return undefined;
    return tiers
      .filter(
        (t): t is { value: number; label: string } =>
          !!t &&
          typeof t === "object" &&
          typeof (t as { value?: unknown }).value === "number" &&
          typeof (t as { label?: unknown }).label === "string",
      )
      .map((t) => ({ value: t.value, label: t.label }));
  } catch {
    return undefined;
  }
}

interface Props {
  params: Promise<{ element: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { element } = await params;
  const meta = await getElementLive(element);
  if (!meta) return {};
  return {
    title: `${meta.name} — Shaman Kathmandu`,
    description: meta.energyDescription,
  };
}

export default async function ElementPage({ params }: Props) {
  const { element } = await params;
  const locale = await getLocale();
  const meta = await getElementLive(element);
  if (!meta) notFound();

  const [initial, priceTiers, spotlight] = await Promise.all([
    listProducts({ elementSlug: meta.slug, limit: 24 }, locale),
    getPriceTiers(),
    getCuratedElementSpotlight(meta.slug),
  ]);

  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs
            items={[
              { href: "/", label: "Home" },
              { href: "/nature", label: "Nature" },
              { label: meta.name },
            ]}
          />
        </section>
        <section
          data-element={meta.slug}
          className="relative px-6 md:px-10 py-16 md:py-24 mx-auto max-w-[1400px] text-center"
          style={{
            background: `radial-gradient(ellipse at 50% 30%, ${meta.accent}26 0%, transparent 60%)`,
          }}
        >
          <span
            className="text-7xl md:text-8xl block mb-6"
            style={{ color: meta.accent }}
            aria-hidden
          >
            {meta.icon}
          </span>
          <p className="label-eyebrow mb-3" style={{ color: meta.accent }}>
            {meta.natureSource}
          </p>
          <h1 className="display-heading font-display text-5xl md:text-7xl text-[var(--color-cream)] leading-tight mb-6">
            {meta.name}
          </h1>
          <p className="max-w-2xl mx-auto text-[var(--color-gold-muted)] leading-relaxed">
            {meta.energyDescription}
          </p>
        </section>
        {spotlight.length > 0 && (
          <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-10 border-t border-[var(--color-border)]">
            <p
              className="label-eyebrow mb-6"
              style={{ color: meta.accent }}
            >
              Spotlight
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {spotlight.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
        <ElementListing
          element={meta.slug}
          initialProducts={initial.products}
          initialTotal={initial.total}
          priceTiers={priceTiers}
          locale={locale}
        />
      </SiteShell>
    </SiteProviders>
  );
}
