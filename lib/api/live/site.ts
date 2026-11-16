import { found } from "@/lib/api/client";
import * as server from "@/lib/api/server/site";
import type { SiteConfig } from "@/lib/api/types";

export async function getSite(): Promise<SiteConfig> {
  return found(await server.getSite(), "Site config");
}
