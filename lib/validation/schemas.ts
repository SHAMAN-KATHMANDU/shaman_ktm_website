// Zod schemas shared by every /api/sysuser/* write route.

import { z } from "zod";
import { normalizeVideoEmbedUrl } from "@/lib/markdown";
import { LEAD_PHONE_PATTERN } from "@/lib/crm/constants";

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
  heroCardTitle: z.string(),
  heroCardBody: z.string(),
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

// Curated editorial accent for each homepage section (highlight colour).
export const HomeAccentSchema = z.enum(["gold", "green", "clay", "cream", "ink"]);

export const SectionAccentsSchema = z.object({
  offers: HomeAccentSchema.optional(),
  campaign: HomeAccentSchema.optional(),
  clearance: HomeAccentSchema.optional(),
  trust: HomeAccentSchema.optional(),
  who: HomeAccentSchema.optional(),
  memberCircle: HomeAccentSchema.optional(),
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
  sectionAccents: SectionAccentsSchema.default({}),
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

// Physical dimensions (product- or variation-level). Every measurement is
// optional so a product fills only what applies (a bowl: height + diameter +
// weight; a statue: L/W/H). Numbers allow decimals (e.g. 12.5 cm). Stored as a
// single Json column.
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

export const ProductVariationSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1),
  price: z.number().int().nonnegative(),
  // Materialized sum of per-showroom StockLevel rows — accepted on writes only
  // for products not yet on the ledger; recordStockMovement() overwrites it.
  stock: z.number().int().nonnegative().default(0),
  attributes: z.record(z.string(), z.string()).default({}),
  // Reporting-system fields (PR 1).
  label: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  dimensions: DimensionsSchema,
  mrp: z.number().int().nonnegative().nullable().optional(),
  // Admin/MCP-only money fields — never rendered on public surfaces.
  costPrice: z.number().int().nonnegative().nullable().optional(),
  wholesalePrice: z.number().int().nonnegative().nullable().optional(),
  active: z.boolean().default(true),
});

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
  // Reporting-system fields (PR 1). Admin/MCP-only: wholesalePrice never
  // appears on public surfaces; moq IS shown in the /wholesale section.
  legacyImsCode: z.string().trim().min(1).nullable().optional(),
  qrPayload: z.string().trim().min(1).nullable().optional(),
  wholesaleEnabled: z.boolean().default(false),
  wholesalePrice: z.number().int().nonnegative().nullable().optional(),
  moq: z.number().int().positive().nullable().optional(),
  ...SeoFields,
  ...SeoFieldsNe,
});

// ─── Reporting system (PR 1) ─────────────────────────────────────────────────

export const StaffSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number")
    .nullable()
    .optional()
    .or(z.literal("")),
  telegramUserId: z.string().trim().min(1).nullable().optional(),
  defaultShowroomKey: z.string().trim().min(1).nullable().optional(),
  active: z.boolean().default(true),
  adminUserId: z.string().trim().min(1).nullable().optional(),
});

// Admin-only manual ledger adjustment (reason is fixed server-side).
export const StockAdjustmentSchema = z.object({
  variationId: z.string().min(1),
  showroomKey: z.string().min(1),
  delta: z
    .number()
    .int()
    .refine((v) => v !== 0, { message: "Delta must not be zero" }),
  note: z.string().trim().max(500).nullable().optional(),
});

export const StockTransferSchema = z.object({
  variationId: z.string().min(1),
  fromShowroomKey: z.string().min(1),
  toShowroomKey: z.string().min(1),
  qty: z.number().int().positive(),
  note: z.string().trim().max(500).nullable().optional(),
});

// ─── CRM (PR 2, Module A) ────────────────────────────────────────────────────
// Same phone shape as the Member Circle form so numbers stay comparable across
// both intake paths.

const leadPhone = z
  .string()
  .trim()
  .regex(LEAD_PHONE_PATTERN, "Enter a valid phone number");

export const LEAD_STATUS_VALUES = [
  "new",
  "hot",
  "warm",
  "cold",
  "purchase",
  "dnc",
] as const;

export const LEAD_INTEREST_VALUES = [
  "retail",
  "wholesale_b2b",
  "custom_order",
] as const;

export const FOLLOWUP_CHANNEL_VALUES = [
  "whatsapp",
  "call",
  "sms",
  "messenger",
  "instagram",
  "in_person",
] as const;

export const CrmLeadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: leadPhone,
  phoneAlt: leadPhone.nullable().optional().or(z.literal("")),
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  sourceId: z.string().min(1),
  interest: z.enum(LEAD_INTEREST_VALUES),
  // Omitted → "new"; status changes after creation go through the status route
  // so they always leave a history row.
  status: z.enum(LEAD_STATUS_VALUES).optional(),
  askedLocation: z.boolean().optional(),
  willVisit: z.boolean().optional(),
  visitDate: z.string().datetime().nullable().optional(),
  followUpDate: z.string().datetime().nullable().optional(),
  assignedStaffId: z.string().min(1).nullable().optional(),
  showroomKey: z.string().min(1).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  evidenceUrl: z.string().trim().max(1000).nullable().optional(),
});

export const CrmLeadStatusSchema = z.object({
  toStatus: z.enum(LEAD_STATUS_VALUES),
  note: z.string().trim().max(2000).nullable().optional(),
  // Set true to move a lead out of a terminal status (purchase | dnc).
  reopen: z.boolean().optional(),
});

export const CrmFollowupSchema = z.object({
  channel: z.enum(FOLLOWUP_CHANNEL_VALUES),
  followupAt: z.string().datetime().optional(),
  gotResponse: z.boolean().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const MemberLeadPromoteSchema = z.object({
  sourceId: z.string().min(1).optional(),
  interest: z.enum(LEAD_INTEREST_VALUES).optional(),
});

// ─── Sales spine (PR 3, Module B) ────────────────────────────────────────────
// Callers pick items and quantities; unit prices come from the database unless
// an explicit override is sent (a negotiated showroom price).

export const SALE_CHANNEL_VALUES = [
  "online",
  "showroom",
  "wholesale_b2b",
  "event",
] as const;

export const SALE_STATUS_VALUES = ["draft", "confirmed", "void"] as const;

export const SALE_STAFF_ROLE_VALUES = [
  "sold_by",
  "assisted",
  "delivered",
] as const;

export const SaleLineSchema = z.object({
  productId: z.string().min(1),
  variationId: z.string().min(1).nullable().optional(),
  qty: z.number().int().positive().max(10_000),
  unitPrice: z.number().int().nonnegative().optional(),
  lineDiscount: z.number().int().nonnegative().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

export const SaleDraftSchema = z.object({
  channel: z.enum(SALE_CHANNEL_VALUES),
  showroomKey: z.string().min(1).nullable().optional(),
  customerId: z.string().min(1).nullable().optional(),
  crmLeadId: z.string().min(1).nullable().optional(),
  lines: z.array(SaleLineSchema).min(1),
  discountAmount: z.number().int().nonnegative().optional(),
  deliveryFee: z.number().int().nonnegative().optional(),
  paymentMethodId: z.string().min(1).nullable().optional(),
  paymentRef: z.string().trim().max(200).nullable().optional(),
  paymentEvidenceUrl: z.string().trim().max(1000).nullable().optional(),
  dateAd: z.string().datetime().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  staff: z
    .array(
      z.object({
        staffId: z.string().min(1),
        role: z.enum(SALE_STAFF_ROLE_VALUES),
      }),
    )
    .optional(),
});

export const SaleConfirmSchema = z.object({
  // Required only when the draft has no showroom yet.
  showroomKey: z.string().min(1).nullable().optional(),
  paymentMethodId: z.string().min(1).nullable().optional(),
  paymentRef: z.string().trim().max(200).nullable().optional(),
  paymentEvidenceUrl: z.string().trim().max(1000).nullable().optional(),
  closeCrmLead: z.boolean().optional(),
});

export const SaleVoidSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

// ─── B2B / wholesale (PR 5, Module C) ────────────────────────────────────────

export const B2B_ACCOUNT_TYPE_VALUES = [
  "hotel",
  "spa",
  "interior",
  "retailer",
  "exporter",
  "other",
] as const;

export const B2B_ACCOUNT_STATUS_VALUES = [
  "prospect",
  "active",
  "dormant",
  "lost",
] as const;

export const B2B_DEAL_STAGE_VALUES = [
  "contacted",
  "meeting_set",
  "samples_sent",
  "quoted",
  "negotiating",
  "won",
  "lost",
  "deferred",
] as const;

const tradePhone = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number");

export const B2bAccountSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  contactPerson: z.string().trim().max(120).nullable().optional(),
  phone: tradePhone.nullable().optional().or(z.literal("")),
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  address: z.string().trim().max(500).nullable().optional(),
  panNo: z.string().trim().max(30).nullable().optional(),
  accountType: z.enum(B2B_ACCOUNT_TYPE_VALUES),
  tier: z.number().int().min(1).max(3).nullable().optional(),
  status: z.enum(B2B_ACCOUNT_STATUS_VALUES).optional(),
  ownerStaffId: z.string().min(1).nullable().optional(),
  sourceCrmLeadId: z.string().min(1).nullable().optional(),
  showroomKey: z.string().min(1).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const B2bLeadConvertSchema = z.object({
  crmLeadId: z.string().min(1),
  account: B2bAccountSchema.omit({ sourceCrmLeadId: true }),
});

export const B2bDealSchema = z.object({
  b2bAccountId: z.string().min(1),
  dealName: z.string().trim().min(1).max(200),
  stage: z.enum(B2B_DEAL_STAGE_VALUES).optional(),
  quoteAmount: z.number().int().nonnegative().nullable().optional(),
  expectedCloseDate: z.string().datetime().nullable().optional(),
  ownerStaffId: z.string().min(1).nullable().optional(),
  tierApplied: z.number().int().min(1).max(3).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const B2bDealStageSchema = z.object({
  toStage: z.enum(B2B_DEAL_STAGE_VALUES),
  note: z.string().trim().max(2000).nullable().optional(),
  // Set to move a won/lost deal back into the pipeline.
  reopen: z.boolean().optional(),
  // The confirmed sale that closed the deal — only valid when winning it.
  // This is what connects the quote to the revenue.
  linkedSaleId: z.string().min(1).nullable().optional(),
});

// Quote lines are replaced wholesale; every derived column is computed
// server-side from these inputs.
export const B2bQuoteLinesSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        variationId: z.string().min(1).nullable().optional(),
        qty: z.number().int().positive().max(100_000),
        wholesaleRate: z.number().int().nonnegative().optional(),
        note: z.string().trim().max(500).nullable().optional(),
      }),
    )
    .max(500),
});

export const B2bPaymentSchema = z.object({
  amount: z
    .number()
    .int()
    .refine((v) => v !== 0, {
      message: "Amount must not be zero (use a negative amount for a refund)",
    }),
  saleId: z.string().min(1).nullable().optional(),
  paidAt: z.string().datetime().optional(),
  paymentMethodId: z.string().min(1).nullable().optional(),
  isAdvance: z.boolean().optional(),
  reference: z.string().trim().max(200).nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
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

// ─── Marketing & footfall (PR 6, Module D) ───────────────────────────────────

export const FOOTFALL_SOURCE_VALUES = [
  "walk_in",
  "ad",
  "referral",
  "event",
  "passing",
] as const;

export const INQUIRY_TYPE_VALUES = ["inquired", "sold"] as const;

export const SOCIAL_PLATFORM_VALUES = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
] as const;

export const AD_PLATFORM_VALUES = [
  "facebook",
  "instagram",
  "tiktok",
  "google",
  "youtube",
] as const;

export const FootfallInquirySchema = z
  .object({
    variationId: z.string().min(1).nullable().optional(),
    freeTextProduct: z.string().trim().max(200).nullable().optional(),
    inquiryType: z.enum(INQUIRY_TYPE_VALUES),
  })
  .refine((q) => !!q.variationId || !!q.freeTextProduct?.trim(), {
    message: "An inquiry needs a product variation or a free-text product name",
  });

export const FootfallSchema = z.object({
  showroomKey: z.string().min(1),
  dateAd: z.string().datetime().optional(),
  visitorsTotal: z.number().int().nonnegative(),
  // Composition of visitorsTotal; deliberately not required to add up to it,
  // because the sheets this replaces often recorded one without the other.
  individuals: z.number().int().nonnegative().nullable().optional(),
  groups: z.number().int().nonnegative().nullable().optional(),
  source: z.enum(FOOTFALL_SOURCE_VALUES),
  convertedToSale: z.boolean().optional(),
  linkedSaleId: z.string().min(1).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  inquiries: z.array(FootfallInquirySchema).max(100).optional(),
});

export const SocialMetricsSchema = z.object({
  periodAd: z.string().datetime(),
  periodBs: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'periodBs must look like "2083-04"')
    .optional(),
  platform: z.enum(SOCIAL_PLATFORM_VALUES),
  followers: z.number().int().nonnegative().nullable().optional(),
  // Can be negative — accounts lose followers.
  newFollowers: z.number().int().nullable().optional(),
  posts: z.number().int().nonnegative().nullable().optional(),
  stories: z.number().int().nonnegative().nullable().optional(),
  reels: z.number().int().nonnegative().nullable().optional(),
  reach: z.number().int().nonnegative().nullable().optional(),
  impressions: z.number().int().nonnegative().nullable().optional(),
  profileVisits: z.number().int().nonnegative().nullable().optional(),
  avgLikes: z.number().int().nonnegative().nullable().optional(),
  avgComments: z.number().int().nonnegative().nullable().optional(),
  avgSharesSaves: z.number().int().nonnegative().nullable().optional(),
  engagementRate: z.number().min(0).max(1000).nullable().optional(),
});

export const ContentLogSchema = z.object({
  date: z.string().datetime().optional(),
  platform: z.enum(SOCIAL_PLATFORM_VALUES),
  contentType: z.string().trim().min(1).max(60),
  topic: z.string().trim().max(300).nullable().optional(),
  hashtags: z.string().trim().max(500).nullable().optional(),
  reach: z.number().int().nonnegative().nullable().optional(),
  impressions: z.number().int().nonnegative().nullable().optional(),
  likes: z.number().int().nonnegative().nullable().optional(),
  comments: z.number().int().nonnegative().nullable().optional(),
  shares: z.number().int().nonnegative().nullable().optional(),
  saves: z.number().int().nonnegative().nullable().optional(),
  engagementRate: z.number().min(0).max(1000).nullable().optional(),
  linkClicks: z.number().int().nonnegative().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const AdSpendSchema = z.object({
  dateAd: z.string().datetime(),
  platform: z.enum(AD_PLATFORM_VALUES),
  campaignName: z.string().trim().max(200).nullable().optional(),
  amountSpent: z.number().nonnegative(),
  // Three-letter code; the Meta export is AUD, so this is never assumed.
  currency: z.string().trim().length(3),
  // Must be positive: without a real rate the NPR figure would silently be a
  // foreign-currency number, off by roughly 90×.
  fxRate: z.number().positive(),
  impressions: z.number().int().nonnegative().nullable().optional(),
  reach: z.number().int().nonnegative().nullable().optional(),
  frequency: z.number().nonnegative().nullable().optional(),
  results: z.number().int().nonnegative().nullable().optional(),
  costPerResult: z.number().nonnegative().nullable().optional(),
  messagingConversations: z.number().int().nonnegative().nullable().optional(),
});

export const MarketingImportSchema = z.object({
  kind: z.enum(["ad_spend", "social_metrics"]),
  csv: z.string().min(1).max(2_000_000),
});
