// First-touch attribution capture and storage.
// Stores utm parameters, gclid, fbclid, and referrer in a first-party cookie
// (sk_attr, 90 days, SameSite=Lax).

import { z } from "zod";

// Known AI hosts — map to normalized labels for tracking
const AI_REFERRER_MAP: Record<string, string> = {
  "chatgpt.com": "ai:chatgpt",
  "chat.openai.com": "ai:chatgpt",
  "perplexity.ai": "ai:perplexity",
  "copilot.microsoft.com": "ai:copilot",
  "gemini.google.com": "ai:gemini",
  "claude.ai": "ai:claude",
};

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string; // normalized referrer host or AI label
}

// Schema for validation and storage
const AttributionSchema = z.object({
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  utm_term: z.string().max(100).optional(),
  utm_content: z.string().max(100).optional(),
  gclid: z.string().max(200).optional(),
  fbclid: z.string().max(200).optional(),
  referrer: z.string().max(100).optional(),
});

const COOKIE_NAME = "sk_attr";
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, "");

/** Get the host from a URL string, with AI host mapping. */
export function normalizeReferrerHost(referrerUrl: string): string | null {
  try {
    const host = bareHost(new URL(referrerUrl).hostname);
    // Map known AI hosts to their labels
    return AI_REFERRER_MAP[host] || host;
  } catch {
    return null;
  }
}

/** Capture first-touch attribution from URL params and referrer. */
export function captureAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;

  try {
    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    const attr: AttributionData = {};

    // Capture utm parameters
    if (params.has("utm_source")) attr.utm_source = params.get("utm_source") ?? undefined;
    if (params.has("utm_medium")) attr.utm_medium = params.get("utm_medium") ?? undefined;
    if (params.has("utm_campaign")) attr.utm_campaign = params.get("utm_campaign") ?? undefined;
    if (params.has("utm_term")) attr.utm_term = params.get("utm_term") ?? undefined;
    if (params.has("utm_content")) attr.utm_content = params.get("utm_content") ?? undefined;

    // Capture click ID params
    if (params.has("gclid")) attr.gclid = params.get("gclid") ?? undefined;
    if (params.has("fbclid")) attr.fbclid = params.get("fbclid") ?? undefined;

    // Capture referrer (external only, with AI host mapping)
    if (document.referrer) {
      const normalized = normalizeReferrerHost(document.referrer);
      // Same site (apex → www hop included) is not an external referrer.
      if (normalized && normalized !== bareHost(window.location.hostname)) {
        attr.referrer = normalized;
      }
    }

    // Only store if we have data
    if (Object.keys(attr).length === 0) return null;

    // Clip rather than reject: one over-long utm value must not lose the rest.
    for (const key of Object.keys(attr) as (keyof AttributionData)[]) {
      attr[key] = attr[key]?.slice(0, key === "gclid" || key === "fbclid" ? 200 : 100);
    }
    const validated = AttributionSchema.safeParse(attr);
    return validated.success && Object.keys(validated.data).length > 0 ? validated.data : null;
  } catch {
    return null;
  }
}

/** Store attribution in first-party cookie (only once per browser). */
export function storeAttributionIfNew(): AttributionData | null {
  if (typeof window === "undefined") return null;

  // Check if already stored
  const existing = getStoredAttribution();
  if (existing) return existing;

  const attr = captureAttribution();
  if (!attr) return null;

  try {
    const json = JSON.stringify(attr);
    // Set cookie: secure in production, path=/, SameSite=Lax
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(json)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
    return attr;
  } catch {
    return null;
  }
}

/** Retrieve stored attribution from cookie. */
export function getStoredAttribution(): AttributionData | null {
  if (typeof window === "undefined") return null;

  try {
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;

    const json = decodeURIComponent(match.substring(COOKIE_NAME.length + 1));
    return JSON.parse(json) as AttributionData;
  } catch {
    return null;
  }
}

/** Format attribution for lead submission — compacts into a readable string. */
export function formatAttributionForSubmission(attr: AttributionData | null): string {
  if (!attr) return "";

  const parts = [];
  if (attr.utm_source) parts.push(`utm_source=${attr.utm_source}`);
  if (attr.utm_medium) parts.push(`utm_medium=${attr.utm_medium}`);
  if (attr.utm_campaign) parts.push(`utm_campaign=${attr.utm_campaign}`);
  if (attr.utm_term) parts.push(`utm_term=${attr.utm_term}`);
  if (attr.utm_content) parts.push(`utm_content=${attr.utm_content}`);
  if (attr.gclid) parts.push(`gclid=${attr.gclid.substring(0, 20)}...`);
  if (attr.fbclid) parts.push(`fbclid=${attr.fbclid.substring(0, 20)}...`);
  if (attr.referrer) parts.push(`referrer=${attr.referrer}`);

  // The lead APIs cap this field at 256 chars; never let it reject a lead.
  return parts.join(" / ").slice(0, 250);
}
