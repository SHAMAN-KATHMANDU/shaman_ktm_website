"use client";

// Fires a Meta Pixel PageView on client-side (SPA) navigations. The base
// snippet in app/layout.tsx only fires PageView on hard loads, so without
// this every in-app navigation is invisible to Meta. Rendered once in the
// root layout so it persists across navigations (unlike the per-page
// SiteProviders tree, which remounts).

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { pageView } from "@/lib/pixel";

export function PixelRouteEvents() {
  const pathname = usePathname();
  const isFirst = useRef(true);

  useEffect(() => {
    // The base snippet already counted the initial URL — skip it here.
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    // Don't track the admin app.
    if (pathname.startsWith("/sysuser")) return;
    pageView();
  }, [pathname]);

  return null;
}
