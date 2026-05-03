// Zod schemas shared by every /api/sysuser/* write route.

import { z } from "zod";
import { normalizeVideoEmbedUrl } from "@/lib/markdown";

const slug = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lower-kebab-case");

const optionalUrl = z.string().url().or(z.literal("")).optional().nullable();

const videoEmbedUrl = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v == null || v === "" ? null : v))
  .refine(
    (v) => v === null || normalizeVideoEmbedUrl(v) !== null,
    "Only YouTube and Vimeo URLs are allowed",
  );

export const SiteConfigSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  branding: z.object({
    logoUrl: z.string(),
    colors: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
    }),
  }),
  themeTokens: z.object({
    mode: z.enum(["light", "dark"]),
    typography: z.object({
      fontFamily: z.string(),
      baseFontSize: z.number(),
    }),
  }),
  contact: z.object({
    email: z.string().email(),
    phone: z.string(),
    address: z.string(),
    socials: z.record(z.string(), z.string()),
  }),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    ogImage: z.string(),
  }),
  currency: z.string(),
  locales: z.array(z.string()),
  defaultLocale: z.string(),
});

export const HomepageConfigSchema = z.object({
  heroImage: z.string().nullable().optional(),
  heroVideoEmbedUrl: videoEmbedUrl,
  newReleasesProductIds: z.array(z.string()).default([]),
  featuredPostIds: z.array(z.string()).default([]),
  elementSpotlightProductIds: z
    .record(z.string(), z.array(z.string()))
    .default({}),
  servicesPreviewSlugs: z.array(z.string()).default([]),
});

export const ElementSchema = z.object({
  slug,
  name: z.string().min(1),
  icon: z.string().min(1),
  accent: z.string().min(1),
  natureSource: z.string().min(1),
  energyDescription: z.string().min(1),
  position: z.number().int().nonnegative().default(0),
});

export const CategorySchema = z.object({
  slug,
  name: z.string().min(1),
  imageUrl: optionalUrl,
  position: z.number().int().nonnegative().default(0),
});

export const BlogCategorySchema = z.object({
  slug,
  name: z.string().min(1),
  description: z.string().nullable().optional(),
});

export const ProductImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  alt: z.string().nullable().optional(),
  position: z.number().int().nonnegative().default(0),
});

export const ProductVariationSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
  attributes: z.record(z.string(), z.string()).default({}),
});

export const ProductSchema = z.object({
  slug,
  name: z.string().min(1),
  description: z.string(),
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().default("NPR"),
  thumbnailUrl: optionalUrl,
  vendorId: z.string().nullable().optional(),
  elementSlug: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  isFeatured: z.boolean().default(false),
  isNewRelease: z.boolean().default(false),
  position: z.number().int().nonnegative().default(0),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  publishedAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).default([]),
  images: z.array(ProductImageSchema).default([]),
  variations: z.array(ProductVariationSchema).default([]),
});

export const BlogPostSchema = z.object({
  slug,
  title: z.string().min(1),
  excerpt: z.string().min(1),
  bodyMarkdown: z.string(),
  heroImageUrl: optionalUrl,
  heroVideoEmbedUrl: videoEmbedUrl,
  authorName: z.string().min(1),
  categorySlug: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  status: z.enum(["draft", "published"]).default("draft"),
  publishedAt: z.string().datetime().nullable().optional(),
  readingMinutes: z.number().int().positive().default(3),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

export const BundleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
  position: z.number().int().nonnegative().default(0),
});

export const BundleSchema = z.object({
  slug,
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().nullable().optional(),
  thumbnailUrl: optionalUrl,
  position: z.number().int().nonnegative().default(0),
  items: z.array(BundleItemSchema).default([]),
});

export const CollectionSchema = z.object({
  slug,
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  heroImageUrl: optionalUrl,
  position: z.number().int().nonnegative().default(0),
  productIds: z.array(z.string()).default([]),
});

export const PageSchema = z.object({
  slug,
  title: z.string().min(1),
  bodyMarkdown: z.string(),
  publishedAt: z.string().datetime().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
});

export const ServiceSchema = z.object({
  slug,
  name: z.string().min(1),
  element: z.enum(["metal", "earth", "wood", "plant", "water", "air"]),
  duration: z.string(),
  pricePerSession: z.number().int().nonnegative(),
  hero: z.string().nullable().optional(),
  summary: z.string(),
  whatToExpect: z.array(z.string()).default([]),
  relatedProductSlugs: z.array(z.string()).default([]),
  position: z.number().int().nonnegative().default(0),
});

export const ShowroomSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  whatsapp: z.string().min(1),
  mapEmbedUrl: z.string().nullable().optional(),
  position: z.number().int().nonnegative().default(0),
});

export const MediaSignRequest = z.object({
  filename: z.string().min(1).max(200),
  contentType: z
    .string()
    .regex(/^(image|video)\//, "Only image/* or video/* is allowed"),
  bytes: z.number().int().positive().max(200 * 1024 * 1024), // 200 MB cap
});
