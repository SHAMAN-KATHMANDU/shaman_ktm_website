// Prisma-row → public-API DTO mappers.
// Keep every output exactly aligned with lib/api/types.ts so the frontend
// is unaware that the data now comes from Postgres instead of mock seeds.

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

// ─── Site ──────────────────────────────────────────────────────

export function siteFromRow(row: { data: unknown }): SiteConfig {
  return row.data as SiteConfig;
}

// ─── Element ───────────────────────────────────────────────────

export function elementFromRow(row: {
  slug: string;
  name: string;
  icon: string;
  accent: string;
  natureSource: string;
  energyDescription: string;
}): ElementMeta {
  return {
    slug: row.slug as ElementMeta["slug"],
    name: row.name,
    icon: row.icon,
    accent: row.accent,
    natureSource: row.natureSource,
    energyDescription: row.energyDescription,
  };
}

// ─── Category ──────────────────────────────────────────────────

export function categoryFromRow(row: {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  _count?: { products: number };
}): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
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

export function productSummaryFromRow(p: ProductRow): ProductSummary {
  return {
    id: p.id,
    name: p.name,
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
): ProductDetail {
  const summary = productSummaryFromRow(p);
  return {
    ...summary,
    description: p.description,
    images: p.images.map((i) => i.url),
    category: p.category
      ? { id: p.category.id, name: p.category.name, slug: p.category.slug }
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

export function blogPostSummaryFromRow(p: BlogPostRow): BlogPostSummary {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    heroImageUrl: p.heroImageUrl ?? "",
    heroVideoEmbedUrl: p.heroVideoEmbedUrl ?? undefined,
    authorName: p.authorName,
    category: p.category
      ? { slug: p.category.slug, name: p.category.name }
      : { slug: "", name: "" },
    tags: p.tags,
    publishedAt: (p.publishedAt ?? new Date()).toISOString(),
    readingMinutes: p.readingMinutes,
  };
}

export function blogPostDetailFromRow(p: BlogPostRow): BlogPostDetail {
  return {
    ...blogPostSummaryFromRow(p),
    bodyMarkdown: p.bodyMarkdown,
    seoTitle: p.seoTitle ?? undefined,
    seoDescription: p.seoDescription ?? undefined,
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

export function bundleSummaryFromRow(b: BundleRow): BundleSummary {
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    price: b.price,
    items: b.items.map((it) => ({
      productId: it.product.id,
      name: it.product.name,
      quantity: it.quantity,
      thumbnailUrl: it.product.thumbnailUrl ?? "",
    })),
  };
}

export function bundleDetailFromRow(b: BundleRow): BundleDetail {
  return {
    ...bundleSummaryFromRow(b),
    description: b.description ?? "",
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

export function collectionFromRow(c: CollectionRow): Collection {
  return {
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle,
    products: c.products.map((p) => productSummaryFromRow(p.product)),
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

export function pageSummaryFromRow(p: PageRow): PageSummary {
  return {
    slug: p.slug,
    title: p.title,
    publishedAt: p.publishedAt.toISOString(),
  };
}

export function pageDetailFromRow(p: PageRow): PageDetail {
  return {
    ...pageSummaryFromRow(p),
    bodyMarkdown: p.bodyMarkdown,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
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

export function serviceFromRow(s: ServiceRow): Service {
  return {
    slug: s.slug,
    name: s.name,
    element: s.element as Service["element"],
    duration: s.duration,
    pricePerSession: s.pricePerSession,
    hero: s.hero ?? "",
    summary: s.summary,
    whatToExpect: Array.isArray(s.whatToExpect)
      ? (s.whatToExpect as string[])
      : [],
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

export function showroomFromRow(s: ShowroomRow): Showroom {
  return {
    key: s.key,
    name: s.name,
    address: s.address,
    whatsapp: s.whatsapp,
    mapEmbedUrl: s.mapEmbedUrl ?? "",
  };
}
