// NCM (Nepal Can Move) API client. Pure fetch wrapper with Zod parsing,
// no DB. Config from env; timeouts on slow responses; throws CmsError on
// non-2xx status or parse failure.

import { z } from "zod";
import { env } from "@/lib/env";
import { CmsError } from "@/lib/cms/errors";

const BASE_URLS = {
  demo: "https://demo.nepalcanmove.com/api",
  live: "https://portal.nepalcanmove.com/api",
} as const;

const BranchSchema = z.object({
  pk: z.number(),
  code: z.string(),
  name: z.string(),
  province_name: z.string().optional(),
  district_name: z.string().optional(),
}).passthrough(); // Allow extra fields

const ShippingRateSchema = z.object({
  charge: z.coerce.number(),
});

const OrderResponseSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  orderid: z.union([z.number(), z.string()]).optional(),
  tracking_number: z.string().optional(),
  tracking_id: z.string().optional(),
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
    const url = new URL(endpoint, this.baseUrl);
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
    const data = await this.request<unknown[]>("GET", "/v2/branches");
    if (!Array.isArray(data)) {
      throw new CmsError("NCM branches endpoint returned non-array");
    }
    return data.map((raw) => {
      const parsed = BranchSchema.safeParse(raw);
      if (!parsed.success) {
        throw new CmsError(`Invalid branch data from NCM: ${parsed.error.message}`);
      }
      return {
        id: parsed.data.pk,
        code: parsed.data.code,
        name: parsed.data.name,
        district: parsed.data.district_name || "",
      };
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
    return parsed.data.charge;
  }

  async createNcmOrder(params: CreateOrderParams): Promise<{
    ncmOrderId: string;
    trackingNumber: string | null;
  }> {
    const payload = {
      name: params.name,
      phone: params.phone,
      phone2: params.phone2 || "",
      cod_charge: params.codCharge,
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
    const parsed = OrderResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw new CmsError(`Invalid order creation response: ${parsed.error.message}`);
    }

    const ncmOrderId = String(parsed.data.orderid || parsed.data.id || "");
    if (!ncmOrderId) {
      throw new CmsError("NCM order creation returned no order ID");
    }

    const trackingNumber = (parsed.data.tracking_number || parsed.data.tracking_id || null) as string | null;
    return { ncmOrderId, trackingNumber };
  }

  async getOrderStatus(ncmOrderId: string): Promise<OrderStatus | null> {
    try {
      const data = await this.request<unknown>("GET", "/v1/order", {
        query: { id: ncmOrderId },
      });
      const parsed = z.object({ status: z.string() }).passthrough().safeParse(data);
      if (!parsed.success) return null;
      return { status: parsed.data.status };
    } catch {
      return null;
    }
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
