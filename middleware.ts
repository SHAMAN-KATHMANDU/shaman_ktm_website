// Edge middleware: gate /sysuser/* and /api/sysuser/* (except auth endpoints
// and the login page) on the iron-session cookie. Detailed verification
// happens inside route handlers via adminGuard() — this just rejects fast.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "sk_sysuser";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = !!req.cookies.get(SESSION_COOKIE);

  // Public auth endpoints + the login page must remain reachable.
  const isAuthEndpoint =
    pathname === "/api/sysuser/auth/login" ||
    pathname === "/api/sysuser/auth/logout";
  const isLoginPage = pathname === "/sysuser/login";

  if (isAuthEndpoint || isLoginPage) return NextResponse.next();

  if (pathname.startsWith("/api/sysuser/")) {
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
  matcher: ["/sysuser/:path*", "/api/sysuser/:path*"],
};
