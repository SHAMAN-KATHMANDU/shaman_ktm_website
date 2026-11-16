import { mockPages } from "@/data/mock/pages";
import type { PageDetail } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function getPage(slug: string, locale: Locale = "en"): Promise<PageDetail> {
  const found = mockPages.find((p) => p.slug === slug);
  if (!found) throw new Error(`Page not found: ${slug}`);
  return found;
}
