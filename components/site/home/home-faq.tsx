import { getPage } from "@/lib/api";
import { extractFaqItems } from "@/lib/faq";
import { renderMarkdown } from "@/lib/markdown";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { localizeHref, type Locale } from "@/lib/i18n/locale";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { Button } from "@/components/site/shared/button";

const FAQ_SLUG = "faq";
const MAX_ITEMS = 6;

// FAQ teaser (homeFaq module): the first questions of the "faq" CMS page as a
// native <details> accordion — answers stay in the HTML for crawlers and work
// without JS. The FAQPage JSON-LD lives on /pages/faq only; repeating the same
// questions' markup here would be duplicate structured data.
export async function HomeFaq({ locale }: { locale: Locale }) {
  let body: string;
  try {
    body = (await getPage(FAQ_SLUG, locale)).bodyMarkdown;
  } catch {
    return null;
  }
  const items = extractFaqItems(body).slice(0, MAX_ITEMS);
  if (items.length === 0) return null;
  const t = getDictionary(locale).homeFaq;

  return (
    <section className="bg-bone text-ink">
      <div className="mx-auto max-w-[900px] px-6 md:px-10 py-20 md:py-28">
        <SectionHeading eyebrow={t.eyebrow} title={t.heading} className="mb-12" />
        <div className="border-t border-line">
          {items.map((it, i) => (
            <details key={`${it.question}-${i}`} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-lg md:text-xl [&::-webkit-details-marker]:hidden">
                {it.question}
                <span
                  aria-hidden
                  className="shrink-0 text-ink-soft transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div
                className="prose pb-6 text-ink-soft"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(it.answerMarkdown) }}
              />
            </details>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button href={localizeHref(`/pages/${FAQ_SLUG}`, locale)} variant="outline">
            {t.viewAll}
          </Button>
        </div>
      </div>
    </section>
  );
}
