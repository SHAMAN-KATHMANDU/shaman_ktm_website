import { listFaqs } from "@/lib/faq-data";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { localizeHref, type Locale } from "@/lib/i18n/locale";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { Button } from "@/components/site/shared/button";
import { FaqAccordion } from "@/components/site/shared/faq-accordion";

const MAX_ITEMS = 6;

// FAQ teaser (homeFaq module): the questions marked "show on home" in
// /sysuser/faqs. The FAQPage JSON-LD lives on /pages/faq (or the question's
// category page); repeating it here would be duplicate structured data.
export async function HomeFaq({ locale }: { locale: Locale }) {
  const items = (await listFaqs("home", locale)).slice(0, MAX_ITEMS);
  if (items.length === 0) return null;
  const t = getDictionary(locale).homeFaq;

  return (
    <section className="bg-bone text-ink">
      <div className="mx-auto max-w-[900px] px-6 md:px-10 py-20 md:py-28">
        <SectionHeading eyebrow={t.eyebrow} title={t.heading} className="mb-12" />
        <FaqAccordion items={items} />
        <div className="mt-10 text-center">
          <Button href={localizeHref("/pages/faq", locale)} variant="outline">
            {t.viewAll}
          </Button>
        </div>
      </div>
    </section>
  );
}
