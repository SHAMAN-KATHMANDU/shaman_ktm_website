import { notFound } from "next/navigation";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { getSiteModules } from "@/lib/site-modules";
import { listWholesaleProducts } from "@/lib/wholesale";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { WholesaleCard } from "@/components/site/wholesale/wholesale-card";
import { WholesaleEnquiryForm } from "@/components/site/wholesale/wholesale-enquiry-form";

// The trade section. Curated subset, MOQ shown, price deliberately absent —
// enquiring is the only way to a rate, which is what keeps trade pricing off a
// public page that competitors and retail customers can both read.

export const metadata = {
  title: "Wholesale — Shaman Kathmandu",
  description:
    "Trade pricing for hotels, spas, interior studios and retailers. Enquire for rates.",
};

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WholesalePage({ searchParams }: Props) {
  const modules = await getSiteModules();
  // Off until launch: the whole section 404s rather than showing an empty one.
  if (!modules.wholesale) notFound();

  const sp = await searchParams;
  const slugRaw = Array.isArray(sp.product) ? sp.product[0] : sp.product;

  const locale = await getLocale();
  const [products, t] = await Promise.all([
    listWholesaleProducts(locale),
    Promise.resolve(getDictionary(locale)),
  ]);

  // Prefill from the card the visitor clicked — resolved to a real product name
  // rather than echoing the URL, so a hand-edited query can't inject text.
  const picked = slugRaw
    ? products.find((p) => p.slug === slugRaw)?.name
    : undefined;

  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs
            items={[
              { href: "/", label: t.breadcrumbs.home },
              { label: t.wholesale.title },
            ]}
          />
        </section>

        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-8">
          <SectionHeading
            title={t.wholesale.title}
            subtitle={t.wholesale.intro}
            className="mb-12"
          />

          {products.length === 0 ? (
            <p className="py-16 text-center text-[var(--color-gold-muted)]">
              {t.wholesale.empty}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {products.map((p) => (
                <WholesaleCard
                  key={p.id}
                  product={p}
                  moqLabel={t.wholesale.moqLabel}
                  moqUnset={t.wholesale.moqUnset}
                  priceOnEnquiry={t.wholesale.priceOnEnquiry}
                  enquireLabel={t.wholesale.enquire}
                />
              ))}
            </div>
          )}
        </section>

        <section
          id="enquire"
          className="px-6 md:px-10 mx-auto max-w-[900px] py-12 scroll-mt-24"
        >
          <WholesaleEnquiryForm t={t.wholesale} initialProduct={picked} />
        </section>
      </SiteShell>
    </SiteProviders>
  );
}
