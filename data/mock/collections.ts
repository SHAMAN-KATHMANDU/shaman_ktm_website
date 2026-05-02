import type { Collection } from "@/lib/api/types";
import { mockProductSummaries, findProductBySlug } from "./products";
import { toSummary } from "./products";

const pickSummaries = (slugs: string[]) =>
  slugs
    .map((s) => findProductBySlug(s))
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map(toSummary);

export const mockCollections: Collection[] = [
  {
    slug: "new-releases",
    title: "New Releases",
    subtitle: "Just arrived this season",
    products: mockProductSummaries.filter((p) => p.tags?.includes("new")),
  },
  {
    slug: "shaman-essentials",
    title: "Shaman Essentials",
    subtitle: "The first things we'd hand you walking in",
    products: pickSummaries([
      "singing-bowl",
      "ganesh-statue",
      "canned-himalayan-oxygen",
      "sunstone-pearl-bracelet",
      "rose-quartz-pearl-bracelet",
      "tigers-eye-pearl-bracelet",
    ]),
  },
];

export function findCollectionBySlug(slug: string): Collection | undefined {
  return mockCollections.find((c) => c.slug === slug);
}
