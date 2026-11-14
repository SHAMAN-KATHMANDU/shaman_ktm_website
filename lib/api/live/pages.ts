import { found } from "@/lib/api/client";
import * as server from "@/lib/api/server/pages";
import type { PageDetail } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function getPage(slug: string, locale: Locale = "en"): Promise<PageDetail> {
  return found(await server.getPage(slug, locale), `Page ${slug}`);
}
