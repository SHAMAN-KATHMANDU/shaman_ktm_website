// Zod schemas shared by every /api/sysuser/* write route.

import { z } from "zod";
import { normalizeVideoEmbedUrl } from "@/lib/markdown";

const slug = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lower-kebab-case");

const optionalUrl = z.string().url().or(z.literal("")).optional().nullable();

// Reusable SEO sub-schema applied to every entity's editor payload.
export const SeoFields = {
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  ogImageUrl: optionalUrl,
  canonicalUrl: optionalUrl,
  noindex: z.boolean().optional(),
  twitterCard: z.enum(["summary", "summary_large_image"]).optional(),
};

const videoEmbedUrl = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v == null || v === "" ? null : v))
  .refine(
    (v) => v === null || normalizeVideoEmbedUrl(v) !== null,
    "Only YouTube and Vimeo URLs are allowed",
  );

// Brand strip cards on the home page render a title + body pair. The legacy
// shape was a flat string[] (kept under brandStripLines) for backwards-compat
// reads; new entries should populate brandStripCards instead.
const BrandStripCardSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export const HomeCopySchema = z
  .object({
    heroEyebrow: z.string(),
    heroTitle: z.string(),
    heroSubtitle: z.string(),
    heroCtaLabel: z.string(),
    heroCtaHref: z.string(),
    brandStripLines: z.array(z.string()),
    brandStripCards: z.array(BrandStripCardSchema),
    elementsHeading: z.string(),
    elementsSubheading: z.string(),
    newReleasesHeading: z.string(),
    newReleasesSubheading: z.string(),
    featuredStoryEyebrow: z.string(),
    servicesHeading: z.string(),
    servicesSubheading: z.string(),
    footerTagline: z.string(),
    footerCopyright: z.string(),
    newsletterHeading: z.string(),
    newsletterDescription: z.string(),
  })
  .partial()
  .optional();

const NavLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
  external: z.boolean().optional(),
});

export const NavConfigSchema = z
  .object({
    logoHref: z.string(),
    heroPrimaryCta: NavLinkSchema,
    heroSecondaryCta: NavLinkSchema,
    heroScrollHref: z.string(),
    newReleasesAllCta: NavLinkSchema,
    servicesAllCta: NavLinkSchema,
    storiesAllCta: NavLinkSchema,
    headerLinks: z.array(NavLinkSchema),
    headerLoginLabel: z.string(),
    headerLoginHref: z.string(),
    headerSearchHref: z.string(),
    headerWishlistHref: z.string(),
    footerColumns: z.array(
      z.object({
        heading: z.string(),
        links: z.array(NavLinkSchema),
      }),
    ),
    footerLegalLinks: z.array(NavLinkSchema),
    footerQuote: z.string(),
    footerSocials: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        href: z.string(),
      }),
    ),
    ctaProductEnquireLabel: z.string(),
    ctaWhatsappFloatLabel: z.string(),
    ctaNewsletterButtonLabel: z.string(),
  })
  .partial()
  .optional();

const PriceFilterTierSchema = z.object({
  value: z.number().int().positive(),
  label: z.string().min(1),
});

export const SiteConfigSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().min(1),
  branding: z.object({
    logoUrl: z.string(),
    faviconUrl: z.string().optional(),
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
  homeCopy: HomeCopySchema,
  nav: NavConfigSchema,
  priceFilterTiers: z.array(PriceFilterTierSchema).optional(),
  whatsappTemplates: z
    .object({
      // {productName} and {productUrl} are interpolated.
      product: z.string().optional(),
      // {serviceName} is interpolated.
      service: z.string().optional(),
      // No placeholders.
      generic: z.string().optional(),
    })
    .optional(),
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
  priceOnEnquiry: z.boolean().default(false),
  position: z.number().int().nonnegative().default(0),
  status: z.enum(["draft", "published", "archived"]).default("published"),
  publishedAt: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).default([]),
  images: z.array(ProductImageSchema).default([]),
  variations: z.array(ProductVariationSchema).default([]),
  ...SeoFields,
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
  ...SeoFields,
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
  ...SeoFields,
});

export const CollectionSchema = z.object({
  slug,
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  heroImageUrl: optionalUrl,
  position: z.number().int().nonnegative().default(0),
  productIds: z.array(z.string()).default([]),
  ...SeoFields,
});

export const PageSchema = z.object({
  slug,
  title: z.string().min(1),
  bodyMarkdown: z.string(),
  publishedAt: z.string().datetime().optional(),
  ...SeoFields,
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
  ...SeoFields,
});

export const ModulesSchema = z.object({
  homeHero: z.boolean().optional(),
  homeBrandStrip: z.boolean().optional(),
  homeElementsGrid: z.boolean().optional(),
  homeNewReleases: z.boolean().optional(),
  homeFeaturedStory: z.boolean().optional(),
  homeServicesPreview: z.boolean().optional(),
  blogIndex: z.boolean().optional(),
  bundlesIndex: z.boolean().optional(),
  collectionsIndex: z.boolean().optional(),
  servicesIndex: z.boolean().optional(),
  showroomsList: z.boolean().optional(),
  whatsappFloat: z.boolean().optional(),
  search: z.boolean().optional(),
  reviews: z.boolean().optional(),
  cart: z.boolean().optional(),
  showPrices: z.boolean().optional(),
  announcementBar: z.boolean().optional(),
  comingSoonOverlay: z.boolean().optional(),
});

export const AnnouncementSchema = z.object({
  enabled: z.boolean().default(false),
  message: z.string(),
  href: z.string().nullable().optional(),
  bgColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#c4a35a"),
  fgColor: z.string().regex(/^#[0-9a-f]{6}$/i).default("#0a0806"),
  dismissable: z.boolean().default(true),
});

export const RedirectSchema = z.object({
  fromPath: z.string().regex(/^\/.+/, "Path must start with /"),
  toPath: z.string().min(1),
  statusCode: z.union([
    z.literal(301),
    z.literal(302),
    z.literal(307),
    z.literal(308),
  ]).default(308),
  enabled: z.boolean().default(true),
  note: z.string().nullable().optional(),
});

export const ShowroomSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  whatsapp: z.string().min(1),
  mapEmbedUrl: z.string().nullable().optional(),
  position: z.number().int().nonnegative().default(0),
});

// Tight allowlist — better than `image/*` because that lets through risky
// formats like `image/svg+xml` (executable) or `image/heic` (no browser
// support). Add explicit entries here when a new format becomes safe.
const ALLOWED_MEDIA_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const MediaSignRequest = z.object({
  filename: z.string().min(1).max(200),
  contentType: z
    .string()
    .refine(
      (v) => ALLOWED_MEDIA_MIME.has(v),
      "Unsupported file type. Use JPEG, PNG, WebP, AVIF, GIF, MP4, WebM, or MOV.",
    ),
  bytes: z.number().int().positive().max(200 * 1024 * 1024), // 200 MB cap
});
