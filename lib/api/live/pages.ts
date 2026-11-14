import { apiGet } from "@/lib/api/client";
import type { PageDetail } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function getPage(slug: string, locale: Locale = "en"): Promise<PageDetail> {
  const res = await apiGet<{ message: string; page: PageDetail }>(
    `/pages/${encodeURIComponent(slug)}`,
    undefined,
    locale,
  );
  return res.page;
}
