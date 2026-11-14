// Tags on the unstable_cache loaders in lib/api/server/* and public routes;
// admin writes call bumpTags(...) to invalidate them. Keep in sync.

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
  faqs: "faqs",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
