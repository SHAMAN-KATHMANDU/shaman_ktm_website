import { findCollectionBySlug } from "@/data/mock/collections";
import type { Collection } from "@/lib/api/types";

export async function getCollection(slug: string): Promise<Collection> {
  const found = findCollectionBySlug(slug);
  if (!found) throw new Error(`Collection not found: ${slug}`);
  return found;
}
