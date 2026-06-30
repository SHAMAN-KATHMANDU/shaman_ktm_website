// Prisma-row → public-API DTO mappers.
// Keep every output exactly aligned with lib/api/types.ts so the frontend
// is unaware that the data now comes from Postgres instead of mock seeds.
//
// Each mapper takes an optional `locale`. For `ne` it returns the Nepali
// `<field>Ne` value when present, else falls back to the English column. The
// response shape is unchanged — the chosen language rides in the same field —
// so the frontend needs no per-locale types.

import type {
  BlogPostDetail,
  BlogPostSummary,
  BundleDetail,
  BundleSummary,
  Category,
  Collection,
  PageDetail,
  PageSummary,
  ProductDetail,
  ProductSummary,
  Service,
  Showroom,
  SiteConfig,
  ElementMeta,
  ElementSlug,
} from "@/lib/api/types";
import type { Locale } from "@/lib/i18n/locale";

const VALID_ELEMENT_SLUG = new Set<string>([
  "metal",
  "earth",
  "wood",
  "plant",
  "water",
  "air",
]);

function elementSlugsFromDb(slugs: string[]): ElementSlug[] {
  return (slugs ?? []).filter((s): s is ElementSlug => VALID_ELEMENT_SLUG.has(s));
}

/**
 * Resolve `<key>` for the active locale: Nepali `<key>Ne` when present and
 * non-empty, otherwise the English `<key>`. Returns "" when neither is a string.
 */
export function resolveI18nField(
  row: Record<string, unknown>,
  key: string,
  locale: Locale = "en",
): string {
  if (locale === "ne") {
    const ne = row[`${key}Ne`];
    if (typeof ne === "string" && ne.trim() !== "") return ne;
  }
  const en = row[key];
  return typeof en === "string" ? en : "";
}

/** Locale-aware resolver that preserves `null` for optional fields. */
function resolveNullable(
  row: Record<string, unknown>,
  key: string,
  locale: Locale,
): string | null {
  if (locale === "ne") {
    const ne = row[`${key}Ne`];
    if (typeof ne === "string" && ne.trim() !== "") return ne;
  }
  const en = row[key];
  return typeof en === "string" ? en : null;
}

// ─── Site ──────────────────────────────────────────────────────
// Returns the full data blob (both languages); consumers resolve per-locale
// via pickLocalized() at render time.

export function siteFromRow(row: { data: unknown }): SiteConfig {
  return row.data as SiteConfig;
}

// ─── Element ───────────────────────────────────────────────────

export function elementFromRow(
  row: {
    slug: string;
    name: string;
    icon: string;
    accent: string;
    natureSource: string;
    energyDescription: string;
  },
  locale: Locale = "en",
): ElementMeta {
  const r = row as Record<string, unknown>;
  return {
    slug: row.slug as ElementMeta["slug"],
    name: resolveI18nField(r, "name", locale),
    icon: row.icon,
    accent: row.accent,
    natureSource: resolveI18nField(r, "natureSource", locale),
    energyDescription: resolveI18nField(r, "energyDescription", locale),
  };
}

// ─── Category ──────────────────────────────────────────────────

export function categoryFromRow(
  row: {
    id: string;
    slug: string;
    name: string;
    imageUrl: string | null;
    _count?: { products: number };
  },
  locale: Locale = "en",
): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: resolveI18nField(row as Record<string, unknown>, "name", locale),
    imageUrl: row.imageUrl,
    productCount: row._count?.products ?? 0,
  };
}

// ─── Product ───────────────────────────────────────────────────

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  sku?: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  thumbnailUrl: string | null;
  categoryId: string | null;
  vendorId: string | null;
  description: string;
  tags: string[];
  createdAt: Date;
  priceOnEnquiry?: boolean;
  elementSlugs?: string[];
  variations: {
    id: string;
    sku: string;
    price: number;
    stock: number;
    attributes: unknown;
  }[];
  images?: { url: string }[];
  category?: { id: string; name: string; slug: string } | null;
};

export function productSummaryFromRow(
  p: ProductRow,
  locale: Locale = "en",
): ProductSummary {
  return {
    id: p.id,
    name: resolveI18nField(p as Record<string, unknown>, "name", locale),
    slug: p.slug,
    sku: p.sku ?? undefined,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? undefined,
    currency: p.currency,
    thumbnailUrl: p.thumbnailUrl ?? "",
    categoryId: p.categoryId ?? "",
    vendorId: p.vendorId,
    variations: p.variations.map((v) => ({
      id: v.id,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      attributes: (v.attributes as Record<string, string>) ?? {},
    })),
    createdAt: p.createdAt.toISOString(),
    tags: p.tags,
    priceOnEnquiry: !!p.priceOnEnquiry,
    elementSlugs: elementSlugsFromDb(p.elementSlugs ?? []),
  };
}

export function productDetailFromRow(
  p: ProductRow & {
    images: { url: string }[];
    category: { id: string; name: string; slug: string } | null;
  },
  locale: Locale = "en",
): ProductDetail {
  const summary = productSummaryFromRow(p, locale);
  return {
    ...summary,
    description: resolveI18nField(
      p as Record<string, unknown>,
      "description",
      locale,
    ),
    images: p.images.map((i) => i.url),
    category: p.category
      ? {
          id: p.category.id,
          name: resolveI18nField(
            p.category as Record<string, unknown>,
            "name",
            locale,
          ),
          slug: p.category.slug,
        }
      : { id: p.categoryId ?? "", name: "", slug: "" },
    tags: p.tags,
  };
}

// ─── Blog ──────────────────────────────────────────────────────

type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  heroImageUrl: string | null;
  heroVideoEmbedUrl: string | null;
  authorName: string;
  tags: string[];
  publishedAt: Date | null;
  readingMinutes: number;
  seoTitle: string | null;
  seoDescription: string | null;
  category: { slug: string; name: string } | null;
};

export function blogPostSummaryFromRow(
  p: BlogPostRow,
  locale: Locale = "en",
): BlogPostSummary {
  return {
    id: p.id,
    slug: p.slug,
    title: resolveI18nField(p as Record<string, unknown>, "title", locale),
    excerpt: resolveI18nField(p as Record<string, unknown>, "excerpt", locale),
    heroImageUrl: p.heroImageUrl ?? "",
    heroVideoEmbedUrl: p.heroVideoEmbedUrl ?? undefined,
    authorName: p.authorName,
    category: p.category
      ? {
          slug: p.category.slug,
          name: resolveI18nField(
            p.category as Record<string, unknown>,
            "name",
            locale,
          ),
        }
      : { slug: "", name: "" },
    tags: p.tags,
    publishedAt: (p.publishedAt ?? new Date()).toISOString(),
    readingMinutes: p.readingMinutes,
  };
}

export function blogPostDetailFromRow(
  p: BlogPostRow,
  locale: Locale = "en",
): BlogPostDetail {
  return {
    ...blogPostSummaryFromRow(p, locale),
    bodyMarkdown: resolveI18nField(
      p as Record<string, unknown>,
      "bodyMarkdown",
      locale,
    ),
    seoTitle: resolveNullable(p as Record<string, unknown>, "seoTitle", locale) ?? undefined,
    seoDescription:
      resolveNullable(p as Record<string, unknown>, "seoDescription", locale) ?? undefined,
  };
}

// ─── Bundle ────────────────────────────────────────────────────

type BundleRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  items: {
    quantity: number;
    product: { id: string; name: string; thumbnailUrl: string | null };
  }[];
};

export function bundleSummaryFromRow(
  b: BundleRow,
  locale: Locale = "en",
): BundleSummary {
  return {
    id: b.id,
    slug: b.slug,
    title: resolveI18nField(b as Record<string, unknown>, "title", locale),
    price: b.price,
    items: b.items.map((it) => ({
      productId: it.product.id,
      name: resolveI18nField(it.product as Record<string, unknown>, "name", locale),
      quantity: it.quantity,
      thumbnailUrl: it.product.thumbnailUrl ?? "",
    })),
  };
}

export function bundleDetailFromRow(
  b: BundleRow,
  locale: Locale = "en",
): BundleDetail {
  return {
    ...bundleSummaryFromRow(b, locale),
    description: resolveNullable(b as Record<string, unknown>, "description", locale) ?? "",
    compareAtPrice: b.compareAtPrice ?? undefined,
  };
}

// ─── Collection ────────────────────────────────────────────────

type CollectionRow = {
  slug: string;
  title: string;
  subtitle: string | null;
  products: { product: ProductRow }[];
};

export function collectionFromRow(
  c: CollectionRow,
  locale: Locale = "en",
): Collection {
  return {
    slug: c.slug,
    title: resolveI18nField(c as Record<string, unknown>, "title", locale),
    subtitle: resolveNullable(c as Record<string, unknown>, "subtitle", locale),
    products: c.products.map((p) => productSummaryFromRow(p.product, locale)),
  };
}

// ─── Page ──────────────────────────────────────────────────────

type PageRow = {
  slug: string;
  title: string;
  bodyMarkdown: string;
  publishedAt: Date;
  seoTitle: string | null;
  seoDescription: string | null;
};

export function pageSummaryFromRow(
  p: PageRow,
  locale: Locale = "en",
): PageSummary {
  return {
    slug: p.slug,
    title: resolveI18nField(p as Record<string, unknown>, "title", locale),
    publishedAt: p.publishedAt.toISOString(),
  };
}

export function pageDetailFromRow(
  p: PageRow,
  locale: Locale = "en",
): PageDetail {
  return {
    ...pageSummaryFromRow(p, locale),
    bodyMarkdown: resolveI18nField(
      p as Record<string, unknown>,
      "bodyMarkdown",
      locale,
    ),
    seoTitle: resolveNullable(p as Record<string, unknown>, "seoTitle", locale),
    seoDescription: resolveNullable(p as Record<string, unknown>, "seoDescription", locale),
  };
}

// ─── Service ───────────────────────────────────────────────────

type ServiceRow = {
  slug: string;
  name: string;
  element: string;
  duration: string;
  pricePerSession: number;
  hero: string | null;
  summary: string;
  whatToExpect: unknown;
  relatedProductSlugs: string[];
};

export function serviceFromRow(s: ServiceRow, locale: Locale = "en"): Service {
  const r = s as Record<string, unknown>;
  const whatToExpectNe = r["whatToExpectNe"];
  const whatToExpect =
    locale === "ne" && Array.isArray(whatToExpectNe) && whatToExpectNe.length > 0
      ? (whatToExpectNe as string[])
      : Array.isArray(s.whatToExpect)
        ? (s.whatToExpect as string[])
        : [];
  return {
    slug: s.slug,
    name: resolveI18nField(r, "name", locale),
    element: s.element as Service["element"],
    duration: resolveI18nField(r, "duration", locale),
    pricePerSession: s.pricePerSession,
    hero: s.hero ?? "",
    summary: resolveI18nField(r, "summary", locale),
    whatToExpect,
    relatedProductSlugs: s.relatedProductSlugs,
  };
}

// ─── Showroom ──────────────────────────────────────────────────

type ShowroomRow = {
  key: string;
  name: string;
  address: string;
  whatsapp: string;
  mapEmbedUrl: string | null;
};

export function showroomFromRow(
  s: ShowroomRow,
  locale: Locale = "en",
): Showroom {
  return {
    key: s.key,
    name: resolveI18nField(s as Record<string, unknown>, "name", locale),
    address: resolveI18nField(s as Record<string, unknown>, "address", locale),
    whatsapp: s.whatsapp,
    mapEmbedUrl: s.mapEmbedUrl ?? "",
  };
}
