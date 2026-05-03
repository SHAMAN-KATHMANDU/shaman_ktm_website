// Low-level fetch wrapper for the Public Data API.
// Composes URL + auth + Origin (server-side only) + error normalization.

// When NEXT_PUBLIC_PROJECTX_API_BASE is empty, default to same-origin "/api"
// so the live client talks to this app's own /api/public/v1/* routes with
// zero env config. On the server during SSR, fall back to localhost:3000.
const RAW_API_BASE = process.env.NEXT_PUBLIC_PROJECTX_API_BASE ?? "";
const API_BASE =
  RAW_API_BASE !== ""
    ? RAW_API_BASE
    : typeof window === "undefined"
      ? `http://localhost:${process.env.PORT ?? 3000}/api`
      : "/api";
const API_KEY = process.env.NEXT_PUBLIC_PROJECTX_API_KEY ?? "";
const API_ORIGIN = process.env.NEXT_PUBLIC_PROJECTX_ORIGIN ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export type Query = Record<
  string,
  string | number | boolean | undefined | null
>;

export function buildUrl(path: string, query?: Query): string {
  const url = new URL(`${API_BASE}/public/v1${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

const memo = new Map<string, Promise<unknown>>();

/**
 * GET helper. De-dupes concurrent requests for the same URL within a single
 * build/render so generateStaticParams + the page itself don't double-fetch.
 */
export async function apiGet<T>(path: string, query?: Query): Promise<T> {
  const url = buildUrl(path, query);
  const cached = memo.get(url);
  if (cached) return cached as Promise<T>;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;
  if (typeof window === "undefined" && API_ORIGIN) {
    // Browsers set Origin automatically; for server-side fetches we set it
    // explicitly to the bound host so the API's CORS pin passes.
    headers.Origin = API_ORIGIN;
  }

  const promise = (async () => {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = (await res.json()) as { message?: string };
        if (body && typeof body.message === "string") message = body.message;
      } catch {
        // body wasn't JSON — keep default message
      }
      throw new ApiError(res.status, message);
    }
    return (await res.json()) as T;
  })();

  memo.set(url, promise);
  // Don't cache failures — let next call retry.
  promise.catch(() => memo.delete(url));
  return promise;
}
