// Pure registry of which models carry which Nepali (*Ne) columns — the
// single source of truth behind the list_missing_nepali / set_nepali_fields
// MCP tools. Kept free of prisma imports so tests can verify it against
// prisma/schema.prisma without a database.
//
// Deliberately not covered here:
// - ProductImage.altNe — nested in the product payload; use update_product.
// - Service.whatToExpectNe — JSON array; use update_service.
// - SiteConfig home copy / nav *Ne keys — JSON blob; use update_site_config.

import { CACHE_TAGS, type CacheTag } from "@/lib/api/server/tags";

export interface NeFieldEntry {
  /** Column used to address a row (and echoed back as `id`). */
  idField: "id" | "slug" | "key";
  /** English column shown as the row's label. */
  labelField: string;
  /** Settable Nepali columns. */
  fields: readonly string[];
  tags: readonly CacheTag[];
  /** Singleton rows (Announcement) are addressed as id=1; `id` arg ignored. */
  singleton?: boolean;
}

export const NE_FIELDS = {
  Product: {
    idField: "id",
    labelField: "name",
    fields: ["nameNe", "descriptionNe", "seoTitleNe", "seoDescriptionNe"],
    tags: [CACHE_TAGS.products],
  },
  Category: {
    idField: "id",
    labelField: "name",
    fields: ["nameNe"],
    tags: [CACHE_TAGS.categories, CACHE_TAGS.products],
  },
  Element: {
    idField: "slug",
    labelField: "name",
    fields: ["nameNe", "natureSourceNe", "energyDescriptionNe"],
    tags: [CACHE_TAGS.elements],
  },
  Bundle: {
    idField: "id",
    labelField: "title",
    fields: ["titleNe", "descriptionNe", "seoTitleNe", "seoDescriptionNe"],
    tags: [CACHE_TAGS.bundles],
  },
  Collection: {
    idField: "id",
    labelField: "title",
    fields: ["titleNe", "subtitleNe", "seoTitleNe", "seoDescriptionNe"],
    tags: [CACHE_TAGS.collections],
  },
  BlogPost: {
    idField: "id",
    labelField: "title",
    fields: [
      "titleNe",
      "excerptNe",
      "bodyMarkdownNe",
      "seoTitleNe",
      "seoDescriptionNe",
    ],
    tags: [CACHE_TAGS.blog],
  },
  BlogCategory: {
    idField: "slug",
    labelField: "name",
    fields: ["nameNe", "descriptionNe"],
    tags: [CACHE_TAGS.blogCategories, CACHE_TAGS.blog],
  },
  Page: {
    idField: "slug",
    labelField: "title",
    fields: ["titleNe", "bodyMarkdownNe", "seoTitleNe", "seoDescriptionNe"],
    tags: [CACHE_TAGS.pages],
  },
  Service: {
    idField: "slug",
    labelField: "name",
    fields: [
      "nameNe",
      "durationNe",
      "summaryNe",
      "seoTitleNe",
      "seoDescriptionNe",
    ],
    tags: [CACHE_TAGS.services],
  },
  Showroom: {
    idField: "key",
    labelField: "name",
    fields: ["nameNe", "addressNe"],
    tags: [CACHE_TAGS.showrooms],
  },
  Announcement: {
    idField: "id",
    labelField: "message",
    fields: ["messageNe"],
    tags: [CACHE_TAGS.site],
    singleton: true,
  },
} as const satisfies Record<string, NeFieldEntry>;

export type NeEntityType = keyof typeof NE_FIELDS;

/** *Ne columns intentionally NOT reachable via set_nepali_fields. */
export const NE_FIELDS_EXCLUDED: Record<string, readonly string[]> = {
  ProductImage: ["altNe"],
  Service: ["whatToExpectNe"],
};
