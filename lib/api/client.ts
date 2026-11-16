// Browser fetch wrapper for the Public Data API (lib/api/browser.ts).
// Server code never comes through here: it calls lib/api/server/* in-process.

import { cache } from "react";
import { type Locale } from "@/lib/i18n/locale";

const API_BASE = process.env.NEXT_PUBLIC_PROJECTX_API_BASE || "/api";
const API_KEY = process.env.NEXT_PUBLIC_PROJECTX_API_KEY ?? "";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/** In-process lookups return null for "not found"; callers expect a throw. */
export function found<T>(value: T | null, what: string): T {
  if (value === null) throw new ApiError(404, `${what} not found`);
  return value;
}

export type Query = Record<
  string,
  string | number | boolean | undefined | null
>;

export function buildUrl(path: string, query?: Query, locale?: Locale): string {
  // API_BASE may be relative ("/api"); anchor it to the current origin.
  const url = new URL(`${API_BASE}/public/v1${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  // Append locale to query string for cache differentiation (locale is part of cache key).
  // Only set for Nepali — English URLs/caches remain clean.
  if (locale === "ne") {
    url.searchParams.set("locale", "ne");
  }
  return url.toString();
}

const fetchOnce = cache(async (url: string): Promise<unknown> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;

  const res = await fetch(url, { headers, cache: "no-store" });
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
  return (await res.json()) as unknown;
});

export async function apiGet<T>(path: string, query?: Query, locale?: Locale): Promise<T> {
  return (await fetchOnce(buildUrl(path, query, locale))) as T;
}
