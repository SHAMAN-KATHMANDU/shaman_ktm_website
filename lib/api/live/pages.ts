import { apiGet } from "@/lib/api/client";
import type { PageDetail, PageSummary } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function listPages(locale: Locale = "en"): Promise<PageSummary[]> {
  const res = await apiGet<{ message: string; pages: PageSummary[] }>(
    "/pages",
    undefined,
    locale,
  );
  return res.pages;
}

export async function getPage(slug: string, locale: Locale = "en"): Promise<PageDetail> {
  const res = await apiGet<{ message: string; page: PageDetail }>(
    `/pages/${encodeURIComponent(slug)}`,
    undefined,
    locale,
  );
  return res.page;
}
