import { apiGet } from "@/lib/api/client";
import type { Collection } from "@/lib/api/types";

export async function getCollection(
  slug: string,
  params: { limit?: number } = {},
): Promise<Collection> {
  const res = await apiGet<{ message: string; collection: Collection }>(
    `/collections/${encodeURIComponent(slug)}`,
    params,
  );
  return res.collection;
}
