import { apiGet } from "@/lib/api/client";
import type { PageDetail, PageSummary } from "@/lib/api/types";

export async function listPages(): Promise<PageSummary[]> {
  const res = await apiGet<{ message: string; pages: PageSummary[] }>("/pages");
  return res.pages;
}

export async function getPage(slug: string): Promise<PageDetail> {
  const res = await apiGet<{ message: string; page: PageDetail }>(
    `/pages/${encodeURIComponent(slug)}`,
  );
  return res.page;
}
