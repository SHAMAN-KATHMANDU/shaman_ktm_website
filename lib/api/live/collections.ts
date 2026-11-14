import { found } from "@/lib/api/client";
import * as server from "@/lib/api/server/collections";
import type { Collection } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function getCollection(slug: string, locale: Locale = "en"): Promise<Collection> {
  return found(await server.getCollection(slug, locale), `Collection ${slug}`);
}
