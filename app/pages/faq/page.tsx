import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { localizeHref } from "@/lib/i18n/locale";
import { pageMetadata, siteUrl } from "@/lib/seo";
import { listFaqs } from "@/lib/faq-data";
import { buildFaqPage, FAQ_SCHEMA_MIN_ITEMS } from "@/lib/faq";
import { FAQ_TOPICS } from "@/lib/validation/schemas";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { Button } from "@/components/site/shared/button";
import { FaqAccordion } from "@/components/site/shared/faq-accordion";
import { JsonLd, buildBreadcrumbList } from "@/components/site/shared/json-ld";

// The FAQ, edited as individual questions in /sysuser/faqs (or via the MCP
// faq tools). This static segment takes precedence over /pages/[slug], so the
// URL already linked from the footer and indexed by search engines is kept.

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return pageMetadata(getDictionary(locale).seo.faq, "/pages/faq", locale);
}

export default async function FaqPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const faqs = await listFaqs("page", locale);

  // Sections in FAQ_TOPICS order; a topic with no questions is skipped.
  const sections = FAQ_TOPICS.map((topic) => ({
    topic,
    items: faqs.filter((f) => f.topic === topic),
  })).filter((s) => s.items.length > 0);

  const breadcrumbJsonLd = buildBreadcrumbList([
    { name: t.breadcrumbs.home, url: `${siteUrl}/` },
    { name: t.faqPage.title, url: `${siteUrl}/pages/faq` },
  ]);

  return (
    <SiteProviders>
      <SiteShell>
        <JsonLd data={breadcrumbJsonLd} />
        {faqs.length >= FAQ_SCHEMA_MIN_ITEMS && <JsonLd data={buildFaqPage(faqs)} />}
        <article className="px-6 md:px-10 mx-auto max-w-[900px]">
          <div className="pt-10 pb-6">
            <Breadcrumbs items={[{ href: "/", label: t.breadcrumbs.home }, { label: t.faqPage.title }]} />
          </div>
          <header className="py-8">
            <h1 className="display-heading font-display text-4xl md:text-6xl text-ink leading-tight mb-6">
              {t.faqPage.title}
            </h1>
            <p className="text-ink-soft max-w-2xl">{t.faqPage.intro}</p>
          </header>
          {sections.length === 0 ? (
            <p className="py-16 text-center text-ink-soft">{t.faqPage.empty}</p>
          ) : (
            sections.map((s) => (
              <section key={s.topic} className="pb-12">
                <h2 className="label-eyebrow mb-4">{t.faqPage.topics[s.topic]}</h2>
                <FaqAccordion items={s.items} />
              </section>
            ))
          )}
          <div className="pb-20 pt-4 text-center">
            <h2 className="font-display text-2xl md:text-3xl text-ink mb-3">{t.faqPage.moreHeading}</h2>
            <p className="text-ink-soft mb-6">{t.faqPage.moreBody}</p>
            <Button href={localizeHref("/contact", locale)} variant="outline">
              {t.faqPage.contactCta}
            </Button>
          </div>
        </article>
      </SiteShell>
    </SiteProviders>
  );
}
