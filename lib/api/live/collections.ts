import { apiGet } from "@/lib/api/client";
import type { Collection } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function getCollection(
  slug: string,
  params: { limit?: number } = {},
  locale: Locale = "en",
): Promise<Collection> {
  const res = await apiGet<{ message: string; collection: Collection }>(
    `/collections/${encodeURIComponent(slug)}`,
    params,
    locale,
  );
  return res.collection;
}
