import { apiGet } from "@/lib/api/client";
import type { BundleDetail, BundleSummary } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listBundles(locale: Locale = "en"): Promise<BundleSummary[]> {
  const res = await apiGet<{ message: string; bundles: BundleSummary[] }>(
    "/bundles",
    undefined,
    locale,
  );
  return res.bundles;
}

export async function getBundle(slug: string, locale: Locale = "en"): Promise<BundleDetail> {
  const res = await apiGet<{ message: string; bundle: BundleDetail }>(
    `/bundles/${encodeURIComponent(slug)}`,
    undefined,
    locale,
  );
  return res.bundle;
}
