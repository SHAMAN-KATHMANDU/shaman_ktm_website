import type { BundleDetail } from "@/lib/api/types";
import { findProductBySlug } from "./products";

const slugsToItems = (slugs: string[], qty = 1) =>
  slugs
    .map((slug) => {
      const p = findProductBySlug(slug);
      if (!p) return null;
      return {
        productId: p.id,
        name: p.name,
        quantity: qty,
        thumbnailUrl: p.thumbnailUrl,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

export const mockBundles: BundleDetail[] = [
  {
    id: "bundle-shaman-starter",
    slug: "shaman-starter",
    title: "Shaman Starter",
    description:
      "A small introduction to the elements: a singing bowl, a Ganesh, and a bracelet. The first three things we'd hand to anyone walking in for the first time.",
    price: 12000,
    compareAtPrice: 13200,
    items: slugsToItems([
      "singing-bowl",
      "ganesh-statue",
      "sunstone-pearl-bracelet",
    ]),
  },
  {
    id: "bundle-earth-water-trio",
    slug: "earth-water-trio",
    title: "Earth & Water Trio",
    description:
      "Three dual-element bracelets — stone from the ground, pearl from the river. Stillness, growth, focus.",
    price: 8800,
    compareAtPrice: 9600,
    items: slugsToItems([
      "white-howlite-pearl-bracelet",
      "green-aventurine-pearl-bracelet",
      "tigers-eye-pearl-bracelet",
    ]),
  },
  {
    id: "bundle-metal-air",
    slug: "metal-air",
    title: "Metal & Air",
    description:
      "A singing bowl to set the room and a can of Himalayan oxygen to set the breath.",
    price: 6000,
    compareAtPrice: 6350,
    items: slugsToItems([
      "singing-bowl",
      "canned-himalayan-oxygen",
    ]),
  },
];
