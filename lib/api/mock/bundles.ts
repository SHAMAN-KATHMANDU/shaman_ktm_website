import { mockBundles } from "@/data/mock/bundles";
import type { BundleDetail, BundleSummary } from "@/lib/api/types";

const toSummary = (b: BundleDetail): BundleSummary => ({
  id: b.id,
  slug: b.slug,
  title: b.title,
  price: b.price,
  items: b.items,
});

export async function listBundles(): Promise<BundleSummary[]> {
  return mockBundles.map(toSummary);
}

export async function getBundle(slug: string): Promise<BundleDetail> {
  const found = mockBundles.find((b) => b.slug === slug);
  if (!found) throw new Error(`Bundle not found: ${slug}`);
  return found;
}
