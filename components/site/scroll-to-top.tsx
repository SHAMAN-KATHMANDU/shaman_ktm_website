"use client";

// Pins every forward navigation to the top of the page. Next's own segment
// scrolling silently skips some streamed pages (e.g. product details, whose
// metadata resolves asynchronously), leaving the visitor mid-page at the old
// scroll offset. Mounted once in the root layout so it survives navigations.
//
// Deliberately narrow:
// - back/forward (popstate) keeps the browser/Next restored position;
// - hash links keep their anchor target;
// - query-string-only updates (listing filters) never change usePathname,
//   so they keep their scroll as before.

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  const isPopNavigation = useRef(false);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const onPop = () => {
      isPopNavigation.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    if (isPopNavigation.current) {
      isPopNavigation.current = false;
      return;
    }
    if (window.location.hash) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
