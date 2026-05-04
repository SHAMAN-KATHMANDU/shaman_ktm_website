import type { Metadata } from "next";
import { listShowrooms, getSite } from "@/lib/api";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { JsonLd, buildBreadcrumbList } from "@/components/site/shared/json-ld";
import { siteUrl } from "@/lib/seo";
import { getHomeCopy } from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Contact — Shaman Kathmandu",
  description:
    "Visit a showroom or message us on WhatsApp. Four locations across Kathmandu valley.",
};

export const revalidate = 300;

function buildWaLink(rawNumber: string, message: string): string {
  const digits = rawNumber.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default async function ContactPage() {
  const [showrooms, site, homeCopy] = await Promise.all([
    listShowrooms().catch(() => []),
    getSite().catch(() => null),
    getHomeCopy(),
  ]);

  const localBusinessJsonLd = showrooms.map((s) => ({
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `Shaman Kathmandu — ${s.name}`,
    address: { "@type": "PostalAddress", streetAddress: s.address },
    telephone: s.whatsapp,
    url: `${siteUrl}/contact`,
  }));
  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: "Home", url: `${siteUrl}/` },
    { name: "Contact", url: `${siteUrl}/contact` },
  ]);

  return (
    <SiteProviders>
      <SiteShell>
        <JsonLd data={breadcrumbJsonLd} />
        {localBusinessJsonLd.length > 0 && <JsonLd data={localBusinessJsonLd} />}
        <section className="px-6 md:px-10 pt-10 pb-2 mx-auto max-w-[1100px]">
          <Breadcrumbs
            items={[{ href: "/", label: "Home" }, { label: "Contact" }]}
          />
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1100px] py-16">
      <header className="mb-12 text-center">
        <p className="label-eyebrow mb-3">Contact</p>
        <h1 className="font-display text-4xl md:text-5xl text-[var(--color-cream)] mb-4">
          {homeCopy.contactHeading}
        </h1>
        {homeCopy.contactResponseNote && (
          <p className="text-[var(--color-gold-muted)] max-w-2xl mx-auto">
            {homeCopy.contactResponseNote}
          </p>
        )}
      </header>

      {site?.contact && (
        <div className="grid sm:grid-cols-3 gap-6 mb-12 text-center">
          {site.contact.email && (
            <a
              href={`mailto:${site.contact.email}`}
              className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:border-[var(--color-gold)] transition-colors"
            >
              <p className="label-eyebrow mb-2">Email</p>
              <p className="text-[var(--color-cream)] text-sm">
                {site.contact.email}
              </p>
            </a>
          )}
          {site.contact.phone && (
            <a
              href={`tel:${site.contact.phone.replace(/\s+/g, "")}`}
              className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 hover:border-[var(--color-gold)] transition-colors"
            >
              <p className="label-eyebrow mb-2">Phone</p>
              <p className="text-[var(--color-cream)] text-sm">
                {site.contact.phone}
              </p>
            </a>
          )}
          {site.contact.address && (
            <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <p className="label-eyebrow mb-2">Address</p>
              <p className="text-[var(--color-cream)] text-sm">
                {site.contact.address}
              </p>
            </div>
          )}
        </div>
      )}

      {showrooms.length === 0 ? (
        <p className="text-center text-[var(--color-gold-muted)] py-12">
          Showroom directory is being updated. WhatsApp us in the meantime.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {showrooms.map((s) => (
            <article
              key={s.key}
              className="border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden"
            >
              {s.mapEmbedUrl && (
                <iframe
                  src={s.mapEmbedUrl}
                  className="w-full h-56 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${s.name}`}
                />
              )}
              <div className="p-6">
                <h2 className="font-display text-2xl text-[var(--color-cream)] mb-2">
                  {s.name}
                </h2>
                <p className="text-sm text-[var(--color-gold-muted)] mb-4">
                  {s.address}
                </p>
                <Button
                  href={buildWaLink(
                    s.whatsapp,
                    `Hi, I'd like to visit the ${s.name} showroom.`,
                  )}
                  external
                  variant="primary"
                  className="w-full"
                >
                  WhatsApp this showroom
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
        </section>
      </SiteShell>
    </SiteProviders>
  );
}
