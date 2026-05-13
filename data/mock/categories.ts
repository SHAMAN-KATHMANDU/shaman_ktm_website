import type { Category } from "@/lib/api/types";

/** Product-type taxonomy (independent of the six nature elements). */
export const mockCategories: Category[] = [
  {
    id: "cat-singing-bowls",
    slug: "singing-bowls",
    name: "Singing Bowls",
    productCount: 0,
    imageUrl: null,
  },
  {
    id: "cat-bracelets",
    slug: "bracelets",
    name: "Bracelets",
    productCount: 0,
    imageUrl: null,
  },
  {
    id: "cat-statues",
    slug: "statues",
    name: "Statues",
    productCount: 0,
    imageUrl: null,
  },
  {
    id: "cat-incense-and-resin",
    slug: "incense-and-resin",
    name: "Incense & resin",
    productCount: 0,
    imageUrl: null,
  },
  {
    id: "cat-wellness",
    slug: "wellness",
    name: "Wellness",
    productCount: 0,
    imageUrl: null,
  },
  {
    id: "cat-home-and-altar",
    slug: "home-and-altar",
    name: "Home & altar",
    productCount: 0,
    imageUrl: null,
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return mockCategories.find((c) => c.slug === slug);
}

export function getCategoryById(id: string): Category | undefined {
  return mockCategories.find((c) => c.id === id);
}
