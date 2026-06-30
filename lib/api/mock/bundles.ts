import { mockBundles } from "@/data/mock/bundles";
import type { BundleDetail, BundleSummary } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

const toSummary = (b: BundleDetail): BundleSummary => ({
  id: b.id,
  slug: b.slug,
  title: b.title,
  price: b.price,
  items: b.items,
});

export async function listBundles(locale: Locale = "en"): Promise<BundleSummary[]> {
  return mockBundles.map(toSummary);
}

export async function getBundle(slug: string, locale: Locale = "en"): Promise<BundleDetail> {
  const found = mockBundles.find((b) => b.slug === slug);
  if (!found) throw new Error(`Bundle not found: ${slug}`);
  return found;
}
