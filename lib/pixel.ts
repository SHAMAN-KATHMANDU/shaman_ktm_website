"use client";

// Client-side Meta (Facebook) Pixel event helpers. The base pixel is injected
// in app/layout.tsx (only when !IS_COMING_SOON), which defines window.fbq and
// fires the initial PageView. Everything here is a thin, typed wrapper that
// no-ops when fbq is absent — so coming-soon mode, SSR, and ad-blocked
// browsers never throw.
//
// The golden rule (see the plan): a product's identity across every event is
// its SLUG. content_ids/contents[].id here MUST equal the feed <g:id> and the
// og:product:retailer_item_id so Meta can match an event to its catalog photo.

type FbqParams = Record<string, unknown>;

interface Fbq {
  (command: "track", event: string, params?: FbqParams, options?: { eventID?: string }): void;
  (command: "trackCustom", event: string, params?: FbqParams): void;
  (command: string, ...args: unknown[]): void;
}

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

const CURRENCY = "NPR";

function fbq(): Fbq | null {
  if (typeof window === "undefined") return null;
  return typeof window.fbq === "function" ? window.fbq : null;
}

/** Fire a standard event. Silently no-ops when the pixel isn't loaded. */
export function track(
  event: string,
  params?: FbqParams,
  options?: { eventID?: string },
): void {
  const q = fbq();
  if (!q) return;
  try {
    q("track", event, params, options);
  } catch {
    // Never let analytics break a user flow.
  }
}

export function pageView(): void {
  track("PageView");
}

// ─── E-commerce events ───────────────────────────────────────────────────────
// `contentId` is the catalog item id from lib/catalog-id (variation id, or the
// product slug when there are no variations) — it MUST equal the feed item id.

interface Viewable {
  contentId: string;
  name: string;
  price: number;
  currency?: string;
  priceOnEnquiry?: boolean;
}

export function trackViewContent(p: Viewable): void {
  track("ViewContent", {
    content_ids: [p.contentId],
    content_type: "product",
    content_name: p.name,
    currency: p.currency ?? CURRENCY,
    contents: [
      {
        id: p.contentId,
        quantity: 1,
        ...(p.priceOnEnquiry ? {} : { item_price: p.price }),
      },
    ],
    // Enquiry-only products have no meaningful value — omit it.
    ...(p.priceOnEnquiry ? {} : { value: p.price }),
  });
}

interface AddableItem {
  contentId: string;
  name: string;
  price: number;
  quantity: number;
  currency?: string;
}

export function trackAddToCart(item: AddableItem): void {
  track("AddToCart", {
    content_ids: [item.contentId],
    content_type: "product",
    content_name: item.name,
    contents: [
      { id: item.contentId, quantity: item.quantity, item_price: item.price },
    ],
    currency: item.currency ?? CURRENCY,
    value: item.price * item.quantity,
  });
}

interface LineItem {
  contentId: string;
  quantity: number;
  /** Unit price in whole NPR — improves Meta's item-level catalog matching. */
  itemPrice?: number;
}

function toContents(items: LineItem[]) {
  return items.map((i) => ({
    id: i.contentId,
    quantity: i.quantity,
    ...(i.itemPrice != null ? { item_price: i.itemPrice } : {}),
  }));
}

export function trackInitiateCheckout(items: LineItem[], value: number): void {
  track("InitiateCheckout", {
    content_ids: items.map((i) => i.contentId),
    content_type: "product",
    contents: toContents(items),
    currency: CURRENCY,
    num_items: items.reduce((sum, i) => sum + i.quantity, 0),
    value,
  });
}

interface PurchaseInput {
  orderNumber: string;
  items: LineItem[];
  value: number;
  currency?: string;
}

/**
 * Fire Purchase exactly once per order. The orderNumber is used both as the
 * Meta eventID (for future Conversions API dedup) and as a localStorage guard
 * so a page refresh or a retried submit can't double-count the conversion.
 */
export function trackPurchase(order: PurchaseInput): void {
  const guardKey = `sk:fb:purchased:${order.orderNumber}`;
  if (typeof window !== "undefined") {
    try {
      if (window.localStorage.getItem(guardKey)) return;
      window.localStorage.setItem(guardKey, "1");
    } catch {
      // localStorage unavailable (private mode) — fall through and still fire.
    }
  }
  track(
    "Purchase",
    {
      content_ids: order.items.map((i) => i.contentId),
      content_type: "product",
      contents: toContents(order.items),
      currency: order.currency ?? CURRENCY,
      num_items: order.items.reduce((sum, i) => sum + i.quantity, 0),
      value: order.value,
    },
    { eventID: order.orderNumber },
  );
}

export function trackSearch(query: string): void {
  track("Search", { search_string: query });
}
