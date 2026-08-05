// NCM (Nepal Can Move) API client. Pure fetch wrapper with Zod parsing,
// no DB. Config from env; timeouts on slow responses; throws CmsError on
// non-2xx status or parse failure.
//
// Endpoints and payloads follow the official NCM API docs (README dated
// 2026-05-27): branches are /api/v2, everything order-related is /api/v1,
// auth is `Authorization: Token <key>`. Rate limits: 1,000 order creates and
// 20,000 order views per day.

import { z } from "zod";
import { env } from "@/lib/env";
import { CmsError } from "@/lib/cms/errors";

const BASE_URLS = {
  demo: "https://demo.nepalcanmove.com/api",
  live: "https://portal.nepalcanmove.com/api",
} as const;

// The docs don't publish the branch-list response shape, only that entries
// carry name/district/coverage details (label API shows {name, code,
// district}). Parse tolerantly: only `name` is load-bearing — order creation
// addresses branches by NAME (e.g. "BIRATNAGAR").
const BranchSchema = z.object({
  pk: z.union([z.number(), z.string()]).optional(),
  id: z.union([z.number(), z.string()]).optional(),
  code: z.string().optional(),
  name: z.string(),
  district: z.string().optional(),
  district_name: z.string().optional(),
}).passthrough();

// Rate response shape is undocumented; accept a bare number or any object
// carrying an obvious charge field.
const ShippingRateSchema = z.union([
  z.coerce.number(),
  z.object({ charge: z.coerce.number() }).passthrough().transform((o) => o.charge),
  z.object({ total_charge: z.coerce.number() }).passthrough().transform((o) => o.total_charge),
  z.object({ delivery_charge: z.coerce.number() }).passthrough().transform((o) => o.delivery_charge),
]);

// Documented create response: { "Message": "Order Successfully Created",
// "orderid": 747 } — the orderid doubles as the tracking reference.
const OrderCreateResponseSchema = z.object({
  orderid: z.union([z.number(), z.string()]),
}).passthrough();

// Documented order-detail response (GET /v1/order?id=): cod_charge,
// delivery_charge, last_delivery_status, payment_status.
const OrderDetailSchema = z.object({
  last_delivery_status: z.string().optional(),
  delivery_charge: z.coerce.number().optional(),
  payment_status: z.string().optional(),
}).passthrough();

export interface BranchInfo {
  id: number;
  code: string;
  name: string;
  district: string;
}

export interface CreateOrderParams {
  name: string;
  phone: string;
  codCharge: number;
  address: string;
  sourceBranch: string;
  destBranch: string;
  deliveryType: "Door2Door" | "Branch2Door" | "Door2Branch" | "Branch2Branch";
  package?: string;
  orderIdentifier?: string;
  phone2?: string;
  instruction?: string;
  weight?: string;
}

export interface OrderStatus {
  status: string;
  updatedAt?: string;
}

export class NcmClient {
  private baseUrl: string;
  private token: string;

  constructor(token: string, mode: "demo" | "live" = "demo") {
    this.token = token;
    this.baseUrl = BASE_URLS[mode];
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options?: { query?: Record<string, string | number>; body?: unknown },
  ): Promise<T> {
    // Plain concatenation: new URL("/v1/…", base) would resolve against the
    // host root and silently drop the /api prefix.
    const url = new URL(this.baseUrl + endpoint);
    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const urlString = url.toString();
    let signal: AbortSignal | undefined;
    try {
      signal = AbortSignal.timeout(15000);
    } catch {
      // AbortSignal.timeout not available in test environment
      signal = undefined;
    }

    const response = await fetch(urlString, {
      method,
      headers: {
        Authorization: `Token ${this.token}`,
        "Accept": "application/json",
        "Content-Type": "application/json",
        "User-Agent": "NepalCanMoveTSClient",
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      ...(signal ? { signal } : {}),
    }).catch((err) => {
      throw new CmsError(`NCM API request failed: ${err.message}`);
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        if (body.detail) detail = body.detail;
        if (body.Error) detail = body.Error;
        if (body.message) detail = body.message;
      } catch {
        // Ignore parse errors; use status detail.
      }
      throw new CmsError(`NCM API error: ${detail}`, {
        statusCode: response.status,
      });
    }

    try {
      return (await response.json()) as T;
    } catch (err) {
      throw new CmsError(`NCM API response parse failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async getBranches(): Promise<BranchInfo[]> {
    const data = await this.request<unknown>("GET", "/v2/branches");
    // Tolerate both a bare array and a paginated { results: [...] } wrapper.
    const rows = Array.isArray(data)
      ? data
      : Array.isArray((data as { results?: unknown[] })?.results)
        ? (data as { results: unknown[] }).results
        : null;
    if (!rows) {
      throw new CmsError("NCM branches endpoint returned an unexpected shape");
    }
    return rows.flatMap((raw, i) => {
      const parsed = BranchSchema.safeParse(raw);
      if (!parsed.success) return []; // skip malformed entries, keep the rest
      return [{
        id: Number(parsed.data.pk ?? parsed.data.id ?? i),
        code: parsed.data.code ?? "",
        name: parsed.data.name,
        district: parsed.data.district ?? parsed.data.district_name ?? "",
      }];
    });
  }

  async getShippingRate(params: {
    from: string;
    to: string;
    type: "Pickup/Collect" | "Send" | "D2B" | "B2B";
  }): Promise<number> {
    const data = await this.request<unknown>("GET", "/v1/shipping-rate", {
      query: {
        creation: params.from,
        destination: params.to,
        type: params.type,
      },
    });
    const parsed = ShippingRateSchema.safeParse(data);
    if (!parsed.success) {
      throw new CmsError(`Invalid shipping rate response: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  async createNcmOrder(params: CreateOrderParams): Promise<{
    ncmOrderId: string;
    trackingNumber: string | null;
  }> {
    const payload = {
      name: params.name,
      phone: params.phone,
      phone2: params.phone2 || "",
      // Docs send cod_charge as a string ("2200"); amount must include any
      // delivery the customer owes (we pass the order total — the shop
      // absorbs the courier fee).
      cod_charge: String(params.codCharge),
      address: params.address,
      fbranch: params.sourceBranch,
      branch: params.destBranch,
      package: params.package || "",
      vref_id: params.orderIdentifier || "",
      instruction: params.instruction || "",
      delivery_type: params.deliveryType,
      weight: params.weight || "1",
    };

    const data = await this.request<unknown>("POST", "/v1/order/create", {
      body: payload,
    });
    const parsed = OrderCreateResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new CmsError(`Invalid order creation response: ${parsed.error.message}`);
    }

    const ncmOrderId = String(parsed.data.orderid);
    // NCM has no separate tracking code — the orderid is what customers and
    // support reference.
    return { ncmOrderId, trackingNumber: ncmOrderId };
  }

  async getOrderStatus(ncmOrderId: string): Promise<OrderStatus | null> {
    try {
      const data = await this.request<unknown>("GET", "/v1/order", {
        query: { id: ncmOrderId },
      });
      const parsed = OrderDetailSchema.safeParse(data);
      if (!parsed.success || !parsed.data.last_delivery_status) return null;
      return { status: parsed.data.last_delivery_status };
    } catch {
      return null;
    }
  }

  /**
   * Register (or clear, with "") the vendor webhook URL NCM pushes order
   * status events to. POST /v2/vendor/webhook per the official docs; their
   * /v2/vendor/webhook/test endpoint can then verify reachability.
   */
  async setWebhookUrl(webhookUrl: string): Promise<void> {
    await this.request<unknown>("POST", "/v2/vendor/webhook", {
      body: { webhook_url: webhookUrl },
    });
  }
}

export function getNcmClient(): NcmClient {
  const mode = env.NCM_MODE as "demo" | "live";
  if (!env.NCM_TOKEN) {
    throw new CmsError("NCM is not configured (NCM_TOKEN missing)", {
      statusCode: 500,
    });
  }
  return new NcmClient(env.NCM_TOKEN, mode);
}
