// Controlled vocabulary for the marketing & footfall module.

export const FOOTFALL_SOURCES = [
  "walk_in",
  "ad",
  "referral",
  "event",
  "passing",
] as const;

export type FootfallSource = (typeof FOOTFALL_SOURCES)[number];

export const INQUIRY_TYPES = ["inquired", "sold"] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];

export const SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

// Ad platforms overlap with social but aren't identical — Google runs ads and
// posts nothing.
export const AD_PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "google",
  "youtube",
] as const;

export type AdPlatform = (typeof AD_PLATFORMS)[number];

export const METRIC_SOURCES = ["manual", "api", "csv_import"] as const;

export type MetricSource = (typeof METRIC_SOURCES)[number];

// Deliberately open-ended: the Meta export is in AUD today, but the business
// pays for things in USD too, and a new currency shouldn't need a migration.
// The check is shape (ISO-4217-like), not membership.
export const CURRENCY_RE = /^[A-Z]{3}$/;
