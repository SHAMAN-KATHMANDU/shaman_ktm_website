// Q&A extraction from CMS markdown. A CMS page is written as `## Question?`
// headings, each followed by its answer — the FAQ page authored in
// /sysuser/pages. Pulling the pairs back out lets one admin-editable source
// feed both the FAQPage JSON-LD and the home-page FAQ teaser.

export interface FaqItem {
  question: string;
  /** Answer as authored (markdown), for rendering. */
  answerMarkdown: string;
  /** Answer flattened to plain text, for structured data. */
  answerText: string;
}

// Only H2s that read as questions count, so a page that mixes intro headings
// with Q&As doesn't put "Shipping" into the schema as a question.
const QUESTION = /[?？]\s*$/;

export function extractFaqItems(md: string): FaqItem[] {
  const items: FaqItem[] = [];
  let current: { question: string; lines: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const answerMarkdown = current.lines.join("\n").trim();
    if (answerMarkdown) {
      items.push({
        question: current.question,
        answerMarkdown,
        answerText: markdownToText(answerMarkdown),
      });
    }
    current = null;
  };

  for (const line of md.split(/\r?\n/)) {
    const h = /^(#{1,3})\s+(.*\S)\s*$/.exec(line);
    if (h) {
      flush();
      if (h[1] === "##" && QUESTION.test(h[2])) {
        current = { question: h[2], lines: [] };
      }
      continue;
    }
    current?.lines.push(line);
  }
  flush();
  return items;
}

// Google rejects markdown syntax in acceptedAnswer.text; keep the words, drop
// the markup. Links keep their label, list items become sentences.
export function markdownToText(md: string): string {
  return md
    .split(/\r?\n/)
    .map((l) => {
      const isListItem = /^\s*(?:[-*+]|\d+\.)\s+/.test(l);
      const text = l
        .replace(/^\s*(?:[-*+]|\d+\.)\s+/, "")
        .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/(\*\*|__)(.+?)\1/g, "$2")
        .replace(/(\*|_)(.+?)\1/g, "$2")
        .replace(/`([^`]*)`/g, "$1")
        .trim();
      // Without its line break a list runs together; close each item instead.
      return isListItem && text && !/[.!?।:;]$/.test(text) ? `${text}.` : text;
    })
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// Below two pairs a page isn't really an FAQ, and a one-question FAQPage is
// the kind of markup search engines treat as spam.
export const FAQ_SCHEMA_MIN_ITEMS = 2;

export function buildFaqPage(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.question,
      acceptedAnswer: { "@type": "Answer", text: it.answerText },
    })),
  };
}
