import { findCollectionBySlug } from "@/data/mock/collections";
import type { Collection } from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

export async function getCollection(slug: string, locale: Locale = "en"): Promise<Collection> {
  const found = findCollectionBySlug(slug);
  if (!found) throw new Error(`Collection not found: ${slug}`);
  return found;
}
