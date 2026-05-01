import type { Category } from "@/lib/api/types";
import { ELEMENTS } from "./elements";

// Categories on the API are generic; we mirror the six elements as categories
// with stable slugs. Once the live CMS is populated, the slug list here must
// match what the editor creates.
export const mockCategories: Category[] = ELEMENTS.map((el, i) => ({
  id: `cat-${el.slug}-${i + 1}`,
  slug: el.slug,
  name: el.name,
  productCount: 4,
  imageUrl: null,
}));

export function getCategoryBySlug(slug: string): Category | undefined {
  return mockCategories.find((c) => c.slug === slug);
}

export function getCategoryById(id: string): Category | undefined {
  return mockCategories.find((c) => c.id === id);
}
