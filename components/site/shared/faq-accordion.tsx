import { renderMarkdown } from "@/lib/markdown";
import type { FaqItem } from "@/lib/faq";

// Native <details> accordion: answers stay in the server HTML for crawlers and
// open without JS. Answers are admin-authored markdown through the same
// escaping renderer as CMS pages.
export function FaqAccordion({ items }: { items: Pick<FaqItem, "question" | "answerMarkdown">[] }) {
  return (
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
  );
}
