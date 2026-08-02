// Server-side Meta Conversions API sender (node:crypto — never import from
// client components or the Edge middleware bundle; lib/env.ts must stay
// edge-safe, so this lives in its own module).
//
// Only Purchase is sent server-side: it is the event ad blockers and iOS ATT
// lose most often, and it is the one with an authoritative server source (the
// order row). event_id = order number matches the client pixel's eventID
// (lib/pixel.ts trackPurchase), so Meta deduplicates the browser+server pair
// into one conversion. All other events stay client-only.

import { createHash } from "node:crypto";
import { env } from "@/lib/env";
import { siteUrl } from "@/lib/seo";
import { catalogItemId } from "@/lib/catalog-id";

const GRAPH_URL = "https://graph.facebook.com/v21.0";
const TIMEOUT_MS = 5000;

export function hashSha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Meta `ph` normalization: digits only, with country code. Local 10-digit
 * Nepali mobiles (98xxxxxxxx) get the 977 prefix; numbers already carrying a
 * country code pass through unchanged.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("9")) return `977${digits}`;
  return digits;
}

interface PurchaseOrderItem {
  productSlug: string;
  variationId: string | null;
  quantity: number;
  priceAtOrder: number;
}

interface PurchaseCapiInput {
  order: {
    number: string;
    total: number;
    items: PurchaseOrderItem[];
  };
  email: string;
  phone: string;
  /** The checkout request's headers — ip/ua/_fbp/_fbc are extracted here. */
  headers: Headers;
}

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Fire-and-forget: resolves without throwing no matter what — a Meta outage
 * or bad token must never fail or slow a checkout. No-ops when
 * META_CAPI_ACCESS_TOKEN is unset (the feature flag).
 */
export async function sendPurchaseCapi(input: PurchaseCapiInput): Promise<void> {
  const accessToken = env.META_CAPI_ACCESS_TOKEN.trim();
  const pixelId = env.META_PIXEL_ID;
  if (!accessToken || !pixelId) return;

  const { order, headers } = input;
  const cookie = headers.get("cookie");
  const forwardedFor = headers.get("x-forwarded-for");
  const clientIp =
    forwardedFor?.split(",")[0]?.trim() || headers.get("x-real-ip") || null;
  const userAgent = headers.get("user-agent");
  const fbp = cookieValue(cookie, "_fbp");
  const fbc = cookieValue(cookie, "_fbc");
  const testEventCode = env.META_CAPI_TEST_EVENT_CODE.trim();

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_id: order.number,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: `${siteUrl}/checkout`,
        user_data: {
          em: [hashSha256(input.email.trim().toLowerCase())],
          ph: [hashSha256(normalizePhone(input.phone))],
          ...(clientIp ? { client_ip_address: clientIp } : {}),
          ...(userAgent ? { client_user_agent: userAgent } : {}),
          ...(fbp ? { fbp } : {}),
          ...(fbc ? { fbc } : {}),
        },
        custom_data: {
          value: order.total,
          currency: "NPR",
          content_type: "product",
          content_ids: order.items.map((i) =>
            catalogItemId(i.productSlug, i.variationId),
          ),
          contents: order.items.map((i) => ({
            id: catalogItemId(i.productSlug, i.variationId),
            quantity: i.quantity,
            item_price: i.priceAtOrder,
          })),
          num_items: order.items.reduce((sum, i) => sum + i.quantity, 0),
        },
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(
      `${GRAPH_URL}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        `[meta-capi] Purchase ${order.number} rejected: HTTP ${res.status} ${body.slice(0, 500)}`,
      );
    }
  } catch (err) {
    console.error(
      `[meta-capi] Purchase ${order.number} failed:`,
      err instanceof Error ? err.message : err,
    );
  } finally {
    clearTimeout(timeout);
  }
}
