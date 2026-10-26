// Client-side analytics helpers for GA4 and Meta Pixel tracking.
// gtag is loaded in app/layout.tsx; every helper no-ops when it is absent.

type GtagParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (action: string, eventName: string, params?: GtagParams) => void;
    dataLayer?: unknown[];
  }
}

function getGtag(): ((action: string, eventName: string, params?: GtagParams) => void) | null {
  if (typeof window === "undefined") return null;
  return typeof window.gtag === "function" ? window.gtag : null;
}

/** Fire a GA4 event. Silently no-ops when gtag isn't loaded. */
export function trackEvent(
  eventName: string,
  params?: GtagParams,
): void {
  const gtag = getGtag();
  if (!gtag) return;
  try {
    gtag("event", eventName, params);
  } catch {
    // Never let analytics break a user flow.
  }
}

/** Fire a GA4 generate_lead event with method and location. */
export function trackGenerateLead(
  method: "whatsapp" | "phone" | "email" | "form",
  options: { form?: "member_circle" | "wholesale"; link_location?: string } = {},
): void {
  const params: GtagParams = { method };
  if (options.form) params.form = options.form;
  if (options.link_location) params.link_location = options.link_location;
  trackEvent("generate_lead", params);
}
