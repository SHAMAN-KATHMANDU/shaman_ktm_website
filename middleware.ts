// Edge middleware: gate /sysuser/* and /api/sysuser/* (except auth endpoints
// and the login page) on the iron-session cookie. Detailed verification
// happens inside route handlers via adminGuard() — this just rejects fast.
//
// Also enforces Bearer-token auth on /api/public/v1/* when an API key is
// configured. Same-origin app traffic from the storefront (via apiGet) sends
// the key in NEXT_PUBLIC_PROJECTX_API_KEY; missing/wrong → 401.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "sk_sysuser";

function checkPublicApiKey(req: NextRequest): NextResponse | null {
  const required = process.env.NEXT_PUBLIC_PROJECTX_API_KEY;
  if (!required) return null; // unconfigured = no enforcement (dev/local)
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${required}`) return null;
  return NextResponse.json(
    { message: "Unauthorized" },
    { status: 401 },
  );
}

// Origin/Referer-based CSRF defense. Browsers always send Origin on
// cross-origin state-changing requests; if it doesn't match the request's
// own host, the call originated from a third-party page and is rejected.
// For requests Origin is omitted on (some same-origin GETs, navigations),
// we skip the check — only POST/PUT/PATCH/DELETE are guarded.
const STATE_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function checkSameOrigin(req: NextRequest): NextResponse | null {
  if (!STATE_CHANGING.has(req.method)) return null;
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const host = req.headers.get("host");
  if (!host) return null;

  // Compare against the request's own host so multi-domain deploys work.
  const expected = new Set([
    `https://${host}`,
    `http://${host}`,
  ]);

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
  // No Origin and no Referer is uncommon on browser traffic — allow it
  // through so server-to-server tooling (curl, scripts) keeps working,
  // but those callers need a session cookie anyway.
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/public/v1/")) {
    const csrf = checkSameOrigin(req);
    if (csrf) return csrf;
    const fail = checkPublicApiKey(req);
    if (fail) return fail;
    return NextResponse.next();
  }

  const hasSession = !!req.cookies.get(SESSION_COOKIE);

  // Public auth endpoints + the login page must remain reachable.
  const isAuthEndpoint =
    pathname === "/api/sysuser/auth/login" ||
    pathname === "/api/sysuser/auth/logout" ||
    pathname === "/api/sysuser/auth/request-reset" ||
    pathname === "/api/sysuser/auth/reset";
  const isLoginPage =
    pathname === "/sysuser/login" || pathname === "/sysuser/reset";

  if (isAuthEndpoint) {
    // Even unauthenticated auth endpoints need CSRF — login flooding from a
    // third-party page would still hit our rate limiter, but bouncing it at
    // the edge is faster.
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
      url.pathname = "/sysuser/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/sysuser/:path*",
    "/api/sysuser/:path*",
    "/api/public/v1/:path*",
  ],
};
