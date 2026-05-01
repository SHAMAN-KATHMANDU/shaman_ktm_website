import { apiGet } from "@/lib/api/client";
import type { BundleDetail, BundleSummary } from "@/lib/api/types";

export async function listBundles(): Promise<BundleSummary[]> {
  const res = await apiGet<{ message: string; bundles: BundleSummary[] }>(
    "/bundles",
  );
  return res.bundles;
}

export async function getBundle(slug: string): Promise<BundleDetail> {
  const res = await apiGet<{ message: string; bundle: BundleDetail }>(
    `/bundles/${encodeURIComponent(slug)}`,
  );
  return res.bundle;
}
