import { mockPages } from "@/data/mock/pages";
import type { PageDetail, PageSummary } from "@/lib/api/types";

const toSummary = (p: PageDetail): PageSummary => ({
  slug: p.slug,
  title: p.title,
  publishedAt: p.publishedAt,
});

export async function listPages(): Promise<PageSummary[]> {
  return mockPages.map(toSummary);
}

export async function getPage(slug: string): Promise<PageDetail> {
  const found = mockPages.find((p) => p.slug === slug);
  if (!found) throw new Error(`Page not found: ${slug}`);
  return found;
}
