import { apiGet } from "@/lib/api/client";
import type { SiteConfig } from "@/lib/api/types";

export async function getSite(): Promise<SiteConfig> {
  const res = await apiGet<{ message: string; site: SiteConfig }>("/site");
  return res.site;
}
