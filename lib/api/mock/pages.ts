import { mockPages } from "@/data/mock/pages";
import type { PageDetail, PageSummary } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

const toSummary = (p: PageDetail): PageSummary => ({
  slug: p.slug,
  title: p.title,
  publishedAt: p.publishedAt,
});

export async function listPages(locale: Locale = "en"): Promise<PageSummary[]> {
  return mockPages.map(toSummary);
}

export async function getPage(slug: string, locale: Locale = "en"): Promise<PageDetail> {
  const found = mockPages.find((p) => p.slug === slug);
  if (!found) throw new Error(`Page not found: ${slug}`);
  return found;
}
