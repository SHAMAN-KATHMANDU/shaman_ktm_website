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
      "A small introduction to the elements: a singing bowl, a mala, an incense bundle. The first three things we'd hand to anyone walking in for the first time.",
    price: 6800,
    compareAtPrice: 7950,
    items: slugsToItems([
      "tibetan-singing-bowl-7in",
      "sandalwood-mala-108",
      "incense-honey-resin",
    ]),
  },
  {
    id: "bundle-grounding",
    slug: "grounding-set",
    title: "Grounding Set",
    description:
      "Earth-heavy: salt lamp, shungite, river stones. For desks that need anchoring.",
    price: 5400,
    compareAtPrice: 5950,
    items: slugsToItems([
      "himalayan-salt-lamp-medium",
      "shungite-pyramid-50mm",
      "river-stone-trio",
    ]),
  },
  {
    id: "bundle-air-ritual",
    slug: "air-ritual",
    title: "Air Ritual",
    description:
      "Three ways to move air through a room: palo santo, honey-resin incense, pine and fir oil.",
    price: 2400,
    compareAtPrice: 2680,
    items: slugsToItems([
      "palo-santo-bundle",
      "incense-honey-resin",
      "essential-oil-pine-fir",
    ]),
  },
];
