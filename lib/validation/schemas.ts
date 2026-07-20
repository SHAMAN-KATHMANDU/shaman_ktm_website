// Zod schemas shared by every /api/sysuser/* write route.

import { z } from "zod";
import { normalizeVideoEmbedUrl } from "@/lib/markdown";

const slug = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lower-kebab-case");

const optionalUrl = z.string().url().or(z.literal("")).optional().nullable();

/** Absolute http(s) URL or site-relative path (e.g. /image.png). */
const pathOrAbsoluteUrl = z
  .string()
  .refine(
    (v) =>
      v === "" ||
      v.startsWith("/") ||
      /^https?:\/\//i.test(v),
    "Must be a path starting with / or a full http(s) URL",
  );

const optionalPathOrUrl = pathOrAbsoluteUrl
  .or(z.literal(""))
  .optional()
  .nullable();

// Reusable SEO sub-schema applied to every entity's editor payload.
export const SeoFields = {
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  ogImageUrl: optionalUrl,
  canonicalUrl: optionalUrl,
  noindex: z.boolean().optional(),
  twitterCard: z.enum(["summary", "summary_large_image"]).optional(),
};

// ─── Nepali translations ─────────────────────────────────────────────────────
// Every translatable field gets an optional `<field>Ne` counterpart. Absent or
// empty → the storefront falls back to the English column (`ne || en`). Keeping
// them optional means existing English-only payloads keep validating unchanged.

/** Optional Nepali translation of a text field. */
export const neString = z.string().nullable().optional();

// Nepali counterparts of the translatable SEO fields. ogImage / canonical /
// twitterCard are not language-specific, so they are not duplicated.
export const SeoFieldsNe = {
  seoTitleNe: neString,
  seoDescriptionNe: neString,
};

/**
 * Build the `<field>Ne` shape for a base shape, reusing each field's own
 * validator for its Nepali twin (so arrays stay arrays, etc.). Used for the
 * SiteConfig JSON copy blocks where suffixing ~40 keys by hand is noise.
 */
function neShape<T extends z.ZodRawShape>(shape: T): z.ZodRawShape {
  const out: z.ZodRawShape = {};
  for (const [key, validator] of Object.entries(shape)) {
    if (key.endsWith("Ne")) continue; // don't double-suffix existing Ne keys
    out[`${key}Ne`] = validator;
  }
  return out;
}

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

// Hero stat blocks ("200+ curated pieces") and title/body pairs reused by the
// trust band.
const HeroStatSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const TitleBodySchema = z.object({
  title: z.string(),
  body: z.string(),
});

const homeCopyShape = {
  heroEyebrow: z.string(),
  heroTitle: z.string(),
  heroSubtitle: z.string(),
  heroCtaLabel: z.string(),
  heroCtaHref: z.string(),
  heroStats: z.array(HeroStatSchema),
  heroChipTopLeft: z.string(),
  heroChipBottomRight: z.string(),
  brandStripLines: z.array(z.string()),
  brandStripCards: z.array(BrandStripCardSchema),
  taglineQuote: z.string(),
  taglineSubline: z.string(),
  offersEyebrow: z.string(),
  offersHeading: z.string(),
  campaignEyebrow: z.string(),
  campaignHeading: z.string(),
  campaignBlurb: z.string(),
  campaignNote: z.string(),
  campaignMemberPricePrefix: z.string(),
  campaignCtaLabel: z.string(),
  clearanceEyebrow: z.string(),
  clearanceHeading: z.string(),
  clearanceBlurb: z.string(),
  clearanceNote: z.string(),
  clearancePercentPrefix: z.string(),
  trustItems: z.array(TitleBodySchema),
  whoEyebrow: z.string(),
  whoHeading: z.string(),
  whoParagraphs: z.array(z.string()),
  whoPassportQuote: z.string(),
  whoCtaLabel: z.string(),
  whoWhatsappNote: z.string(),
  memberCircleEyebrow: z.string(),
  memberCircleHeading: z.string(),
  memberCircleLede: z.string(),
  memberCircleBenefits: z.array(z.string()),
  memberCircleFormHeading: z.string(),
  memberCircleFormDescription: z.string(),
  memberCircleNameLabel: z.string(),
  memberCircleWhatsappLabel: z.string(),
  memberCircleButtonLabel: z.string(),
  memberCircleFinePrint: z.string(),
  memberCircleSuccessHeading: z.string(),
  memberCircleSuccessMessage: z.string(),
  bundlesPageEyebrow: z.string(),
  bundlesPageHeading: z.string(),
  bundlesPageSubheading: z.string(),
  elementsHeading: z.string(),
  elementsSubheading: z.string(),
  categoriesEyebrow: z.string(),
  categoriesHeading: z.string(),
  categoriesSubheading: z.string(),
  newReleasesEyebrow: z.string(),
  newReleasesHeading: z.string(),
  newReleasesSubheading: z.string(),
  featuredProductsEyebrow: z.string(),
  featuredProductsHeading: z.string(),
  featuredProductsSubheading: z.string(),
  featuredStoryEyebrow: z.string(),
  featuredStoryHeading: z.string(),
  featuredStorySubheading: z.string(),
  servicesEyebrow: z.string(),
  servicesHeading: z.string(),
  servicesSubheading: z.string(),
  footerTagline: z.string(),
  footerCopyright: z.string(),
  newsletterHeading: z.string(),
  newsletterDescription: z.string(),
  naturePageEyebrow: z.string(),
  naturePageHeading: z.string(),
  naturePageSubheading: z.string(),
  energyPageEyebrow: z.string(),
  energyPageHeading: z.string(),
  energyPageSubheading: z.string(),
  energyPageEmptyState: z.string(),
  storiesPageEyebrow: z.string(),
  storiesPageHeading: z.string(),
  storiesPageSubheading: z.string(),
  // Standalone Nepali couplet on /stories (predates the `*Ne` convention).
  storiesPageNepaliCouplet: z.string(),
  contactHeading: z.string(),
  contactSubheading: z.string(),
  contactResponseNote: z.string(),
};

// Every home-copy string also accepts a `<field>Ne` Nepali twin.
export const HomeCopySchema = z
  .object({ ...homeCopyShape, ...neShape(homeCopyShape) })
  .partial()
  .optional();

const NavLinkSchema = z.object({
  label: z.string(),
  href: z.string(),
  external: z.boolean().optional(),
});

const navConfigShape = {
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
};

// Nav labels/links also accept `<field>Ne` Nepali twins (hrefs can stay shared).
export const NavConfigSchema = z
  .object({ ...navConfigShape, ...neShape(navConfigShape) })
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
      productNe: z.string().optional(),
      // {serviceName} is interpolated.
      service: z.string().optional(),
      serviceNe: z.string().optional(),
      // No placeholders.
      generic: z.string().optional(),
      genericNe: z.string().optional(),
    })
    .optional(),
});

// Offers-grid card: either teases a collection (image from the collection or an
// override) or is a text-only promo card (e.g. "Double every discount").
export const OfferCardSchema = z
  .object({
    type: z.enum(["collection", "text"]),
    collectionSlug: z.string().optional().nullable(),
    chipLabel: z.string().optional().nullable(),
    chipLabelNe: neString,
    heading: z.string().min(1),
    headingNe: neString,
    blurb: z.string().min(1),
    blurbNe: neString,
    ctaLabel: z.string().min(1),
    ctaLabelNe: neString,
    ctaHref: z.string().min(1),
    imageUrl: optionalPathOrUrl,
  })
  .refine((c) => c.type === "text" || !!c.collectionSlug, {
    message: "collection cards need a collectionSlug",
    path: ["collectionSlug"],
  });

// Seasonal campaign rail (e.g. Shrawan jewelry). Products come from the
// referenced collection; the member price is computed on top of `price`
// with memberDiscountPercent (whole percent, e.g. 10).
export const CampaignRailSchema = z.object({
  collectionSlug: z.string().min(1),
  badgeLabel: z.string().min(1),
  badgeLabelNe: neString,
  memberDiscountPercent: z.number().int().min(0).max(90).default(0),
});

export const ClearanceConfigSchema = z.object({
  collectionSlug: z.string().min(1),
  percentLabel: z.string().min(1), // e.g. "40%" in the "Up to 40% off" banner
  badgeLabel: z.string().min(1),
  badgeLabelNe: neString,
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
  offersCards: z.array(OfferCardSchema).default([]),
  campaignRail: CampaignRailSchema.nullable().optional(),
  clearance: ClearanceConfigSchema.nullable().optional(),
});

// ─── Member Circle join form ────────────────────────────────────────────────

export const MemberLeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  whatsapp: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid WhatsApp number"),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  source: z.string().max(64).optional(),
  // Honeypot — real users never fill this; bots do. Any value passes
  // validation; the route silently drops non-empty submissions.
  website: z.string().optional(),
});

export const MemberLeadStatusSchema = z.object({
  status: z.enum(["new", "contacted", "activated", "rejected"]),
  note: z.string().max(2000).optional().nullable(),
});

export const ElementSchema = z.object({
  slug,
  name: z.string().min(1),
  nameNe: neString,
  icon: z.string().min(1),
  accent: z.string().min(1),
  natureSource: z.string().min(1),
  natureSourceNe: neString,
  energyDescription: z.string().min(1),
  energyDescriptionNe: neString,
  position: z.number().int().nonnegative().default(0),
});

export const CategorySchema = z.object({
  slug,
  name: z.string().min(1),
  nameNe: neString,
  imageUrl: optionalUrl,
  position: z.number().int().nonnegative().default(0),
});

export const BlogCategorySchema = z.object({
  slug,
  name: z.string().min(1),
  nameNe: neString,
  description: z.string().nullable().optional(),
  descriptionNe: neString,
});

export const ProductImageSchema = z.object({
  id: z.string().optional(),
  url: pathOrAbsoluteUrl,
  alt: z.string().nullable().optional(),
  altNe: neString,
  position: z.number().int().nonnegative().default(0),
});

export const ProductVariationSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative().default(0),
  attributes: z.record(z.string(), z.string()).default({}),
});

// Product-level physical dimensions. Every measurement is optional so a product
// fills only what applies (a bowl: height + diameter + weight; a statue: L/W/H).
// Numbers allow decimals (e.g. 12.5 cm). Stored as a single Json column.
export const DimensionsSchema = z
  .object({
    length: z.number().nonnegative().nullable().optional(),
    width: z.number().nonnegative().nullable().optional(),
    height: z.number().nonnegative().nullable().optional(),
    diameter: z.number().nonnegative().nullable().optional(),
    weight: z.number().nonnegative().nullable().optional(),
    unit: z.enum(["cm", "in"]).default("cm"),
    weightUnit: z.enum(["g", "kg"]).default("g"),
    note: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const elementSlugEnum = z.enum([
  "metal",
  "earth",
  "wood",
  "plant",
  "water",
  "air",
]);

export const ProductSchema = z.object({
  slug,
  name: z.string().min(1),
  nameNe: neString,
  description: z.string(),
  descriptionNe: neString,
  sku: z.string().nullable().optional(),
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().default("NPR"),
  // Product-level stock. null = untracked (always available). Products with
  // variations track stock per variation instead.
  stockQuantity: z.number().int().nonnegative().nullable().optional(),
  dimensions: DimensionsSchema,
  thumbnailUrl: optionalPathOrUrl,
  vendorId: z.string().nullable().optional(),
  elementSlugs: z.array(elementSlugEnum).default([]),
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
  ...SeoFieldsNe,
});

export const BlogPostSchema = z.object({
  slug,
  title: z.string().min(1),
  titleNe: neString,
  excerpt: z.string(),
  excerptNe: neString,
  bodyMarkdown: z.string(),
  bodyMarkdownNe: neString,
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
  ...SeoFieldsNe,
});

export const BundleItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive().default(1),
  position: z.number().int().nonnegative().default(0),
});

export const BundleSchema = z.object({
  slug,
  title: z.string().min(1),
  titleNe: neString,
  description: z.string().nullable().optional(),
  descriptionNe: neString,
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().nullable().optional(),
  thumbnailUrl: optionalUrl,
  position: z.number().int().nonnegative().default(0),
  items: z.array(BundleItemSchema).default([]),
  ...SeoFields,
  ...SeoFieldsNe,
});

export const CollectionSchema = z.object({
  slug,
  title: z.string().min(1),
  titleNe: neString,
  subtitle: z.string().nullable().optional(),
  subtitleNe: neString,
  heroImageUrl: optionalUrl,
  position: z.number().int().nonnegative().default(0),
  productIds: z.array(z.string()).default([]),
  ...SeoFields,
  ...SeoFieldsNe,
});

export const PageSchema = z.object({
  slug,
  title: z.string().min(1),
  titleNe: neString,
  bodyMarkdown: z.string(),
  bodyMarkdownNe: neString,
  publishedAt: z.string().datetime().optional(),
  ...SeoFields,
  ...SeoFieldsNe,
});

export const ServiceSchema = z.object({
  slug,
  name: z.string().min(1),
  nameNe: neString,
  element: z.enum(["metal", "earth", "wood", "plant", "water", "air"]),
  duration: z.string(),
  durationNe: neString,
  pricePerSession: z.number().int().nonnegative(),
  hero: z.string().nullable().optional(),
  summary: z.string(),
  summaryNe: neString,
  whatToExpect: z.array(z.string()).default([]),
  whatToExpectNe: z.array(z.string()).nullable().optional(),
  relatedProductSlugs: z.array(z.string()).default([]),
  position: z.number().int().nonnegative().default(0),
  ...SeoFields,
  ...SeoFieldsNe,
});

export const ModulesSchema = z.object({
  homeHero: z.boolean().optional(),
  homeBrandStrip: z.boolean().optional(),
  homeElementsGrid: z.boolean().optional(),
  homeCategories: z.boolean().optional(),
  homeNewReleases: z.boolean().optional(),
  homeFeaturedProducts: z.boolean().optional(),
  homeFeaturedStory: z.boolean().optional(),
  homeServicesPreview: z.boolean().optional(),
  homeTagline: z.boolean().optional(),
  homeOffers: z.boolean().optional(),
  homeCampaignRail: z.boolean().optional(),
  homeClearance: z.boolean().optional(),
  homeTrustBand: z.boolean().optional(),
  homeWhoWeAre: z.boolean().optional(),
  homeMemberCircle: z.boolean().optional(),
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
  messageNe: neString,
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
  nameNe: neString,
  address: z.string().min(1),
  addressNe: neString,
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
