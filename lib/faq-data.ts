// Server-only reads of the Faq table for the storefront. Kept apart from
// lib/faq.ts (pure helpers, unit-tested without a database).

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import type { Locale } from "@/lib/i18n/locale";
import { markdownToText, type FaqItem } from "@/lib/faq";

export interface StorefrontFaq extends FaqItem {
  id: string;
  topic: string;
}

/**
 * Which rows a surface shows. "page" is /pages/faq (questions not tied to a
 * category); a categoryId is that category page; "home" is the teaser.
 */
export type FaqScope = "page" | "home" | { categoryId: string };

const loadRows = unstable_cache(
  async () => {
    try {
      return await prisma.faq.findMany({
        where: { published: true },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
    } catch {
      // No DB (Docker build) or the table isn't migrated yet: render no FAQs
      // rather than failing the page.
      return [];
    }
  },
  ["storefront-faqs"],
  { tags: [CACHE_TAGS.faqs], revalidate: 60 },
);

export async function listFaqs(scope: FaqScope, locale: Locale): Promise<StorefrontFaq[]> {
  const rows = await loadRows();
  return rows
    .filter((r) =>
      scope === "page"
        ? r.categoryId === null
        : scope === "home"
          ? r.showOnHome
          : r.categoryId === scope.categoryId,
    )
    .map((r) => {
      const question = (locale === "ne" && r.questionNe?.trim()) || r.question;
      const answerMarkdown = (locale === "ne" && r.answerNe?.trim()) || r.answer;
      return {
        id: r.id,
        topic: r.topic,
        question,
        answerMarkdown,
        answerText: markdownToText(answerMarkdown),
      };
    });
}
