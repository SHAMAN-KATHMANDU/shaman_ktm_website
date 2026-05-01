import { mockSite } from "@/data/mock/site";
import type { SiteConfig } from "@/lib/api/types";

export async function getSite(): Promise<SiteConfig> {
  return mockSite;
}
