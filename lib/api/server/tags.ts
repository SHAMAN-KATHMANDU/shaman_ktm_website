// Cache tags used by both public GET routes (export const revalidate = 60)
// and admin write routes (revalidateTag on every mutation). Keep in sync.

export const CACHE_TAGS = {
  site: "site",
  homepage: "homepage",
  elements: "elements",
  categories: "categories",
  products: "products",
  bundles: "bundles",
  collections: "collections",
  pages: "pages",
  blog: "blog",
  blogCategories: "blog-categories",
  services: "services",
  showrooms: "showrooms",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
