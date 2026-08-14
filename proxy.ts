// Edge proxy (Next 16 renamed `middleware` → `proxy`). Gates /sysuser/* and
// /api/sysuser/* on the iron-session cookie, enforces the public-API key +
// CSRF, and attaches the active locale to storefront requests.
//
// Locale: Nepali is served under /ne/* and English at the unprefixed root.
// For a /ne request we rewrite onto the shared (unprefixed) route tree and set
// an `x-locale: ne` request header; everything else gets `x-locale: en`.
// Server components read it via getLocale() (lib/i18n/server.ts). Admin and API
// routes are never localized.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ELEMENT_SLUGS } from "@/data/mock/elements";

const SESSION_COOKIE = "sk_sysuser";
const CUSTOMER_SESSION_COOKIE = "sk_customer";
const ELEMENT_SLUG_SET = new Set<string>(ELEMENT_SLUGS);

function checkPublicApiKey(req: NextRequest): NextResponse | null {
  const required = process.env.NEXT_PUBLIC_PROJECTX_API_KEY;
  if (!required) return null; // unconfigured = no enforcement (dev/local)
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${required}`) return null;
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

// Origin/Referer-based CSRF defense. Browsers always send Origin on
// cross-origin state-changing requests; if it doesn't match the request's
// own host, the call originated from a third-party page and is rejected.
const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function checkSameOrigin(req: NextRequest): NextResponse | null {
  if (!STATE_CHANGING.has(req.method)) return null;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");
  if (!host) return null;

  const expected = new Set([`https://${host}`, `http://${host}`]);

  if (origin) {
    if (!expected.has(origin)) {
      return NextResponse.json(
        { message: "Forbidden — bad origin" },
        { status: 403 },
      );
    }
    return null;
  }
  if (referer) {
    try {
      const url = new URL(referer);
      const refOrigin = `${url.protocol}//${url.host}`;
      if (!expected.has(refOrigin)) {
        return NextResponse.json(
          { message: "Forbidden — bad referer" },
          { status: 403 },
        );
      }
    } catch {
      return NextResponse.json(
        { message: "Forbidden — malformed referer" },
        { status: 403 },
      );
    }
  }
  return null;
}

// Attach `x-locale` to storefront requests, rewriting /ne/* onto the shared
// (unprefixed) route tree so a single set of route files serves both locales.
function withLocale(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const isNe = pathname === "/ne" || pathname.startsWith("/ne/");
  const headers = new Headers(req.headers);
  headers.set("x-locale", isNe ? "ne" : "en");
  if (isNe) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/ne" ? "/" : pathname.slice(3);
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public data API — CSRF + optional bearer key.
  if (pathname.startsWith("/api/public/v1/")) {
    const csrf = checkSameOrigin(req);
    if (csrf) return csrf;
    const fail = checkPublicApiKey(req);
    if (fail) return fail;
    return NextResponse.next();
  }

  const hasSession = !!req.cookies.get(SESSION_COOKIE);

  const isAuthEndpoint =
    pathname === "/api/sysuser/auth/login" ||
    pathname === "/api/sysuser/auth/logout" ||
    pathname === "/api/sysuser/auth/request-reset" ||
    pathname === "/api/sysuser/auth/reset";
  const isLoginPage =
    pathname === "/sysuser/login" || pathname === "/sysuser/reset";

  if (isAuthEndpoint) {
    const csrf = checkSameOrigin(req);
    if (csrf) return csrf;
    return NextResponse.next();
  }
  if (isLoginPage) return NextResponse.next();

  if (pathname.startsWith("/api/sysuser/")) {
    const csrf = checkSameOrigin(req);
    if (csrf) return csrf;
    if (!hasSession) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (pathname === "/sysuser" || pathname.startsWith("/sysuser/")) {
    if (!hasSession) {
      const url = req.nextUrl.clone();
      const from = pathname + req.nextUrl.search;
      url.pathname = "/sysuser/login";
      url.search = "";
      // Keep the query string — the OAuth consent page round-trips
      // /sysuser/oauth-consent?request_id=… through this login redirect.
      url.searchParams.set("from", from);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Customer API — CSRF everywhere; session required beyond the auth
  // endpoints (login/register/reset must work logged-out).
  if (pathname.startsWith("/api/customer/")) {
    const csrf = checkSameOrigin(req);
    if (csrf) return csrf;
    const isCustomerAuthEndpoint =
      pathname === "/api/customer/auth/login" ||
      pathname === "/api/customer/auth/register" ||
      pathname === "/api/customer/auth/logout" ||
      pathname === "/api/customer/auth/request-reset" ||
      pathname === "/api/customer/auth/reset" ||
      // The session probe has to be callable WITHOUT a session — that is the
      // question it answers. Gating it here meant every page load by an
      // anonymous visitor made a request that 401'd before reaching the
      // handler, logging a console error on every view. The handler itself
      // still checks the session and returns user: null.
      pathname === "/api/customer/auth/me";
    if (
      !isCustomerAuthEndpoint &&
      !req.cookies.get(CUSTOMER_SESSION_COOKIE)
    ) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Any other API route (e.g. /api/mcp) — never localized, no CSRF here.
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Signed-in-only storefront pages. Match on the locale-normalized path —
  // Nepali requests arrive here as /ne/account/… before the rewrite.
  const isNe = pathname === "/ne" || pathname.startsWith("/ne/");
  const normalized = isNe ? (pathname === "/ne" ? "/" : pathname.slice(3)) : pathname;
  const isProtectedCustomerPage =
    normalized === "/checkout" ||
    normalized === "/account/dashboard" ||
    normalized === "/account/orders" ||
    normalized.startsWith("/account/orders/");
  if (isProtectedCustomerPage && !req.cookies.get(CUSTOMER_SESSION_COOKIE)) {
    const url = req.nextUrl.clone();
    url.pathname = isNe ? "/ne/account/login" : "/account/login";
    url.search = "";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Legacy /nature URLs → the products listing (element chips). Redirect at
  // the edge so crawlers get a real 308 — the app router streams the shell
  // with a 200 before a page-level redirect can set the status.
  if (normalized === "/nature" || normalized.startsWith("/nature/")) {
    const slug = normalized.split("/")[2];
    const url = req.nextUrl.clone();
    url.pathname = isNe ? "/ne/products" : "/products";
    url.search = "";
    if (slug && ELEMENT_SLUG_SET.has(slug)) url.searchParams.set("element", slug);
    return NextResponse.redirect(url, 308);
  }

  // Storefront — attach locale.
  return withLocale(req);
}

export const config = {
  matcher: [
    // Run on everything except Next internals and metadata files.
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)",
  ],
};
