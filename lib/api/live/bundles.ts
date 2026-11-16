import { found } from "@/lib/api/client";
import * as server from "@/lib/api/server/bundles";
import type { BundleDetail } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export const listBundles = server.listBundles;

export async function getBundle(slug: string, locale: Locale = "en"): Promise<BundleDetail> {
  return found(await server.getBundle(slug, locale), `Bundle ${slug}`);
}
