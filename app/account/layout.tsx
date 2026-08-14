import type { ReactNode } from "react";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";

// The shell lives in a LAYOUT, not in the pages below it, because SiteShell is
// an async server component: it queries the database for nav/showrooms and
// reads the locale from request headers. The pages in this segment are
// "use client", and a client component cannot render a server one — doing so
// threw `headers` was called outside a request scope at runtime and dropped
// every account page into the error boundary.
// A "use client" page cannot export metadata, so before the shell moved
// here these routes had no title or description at all. noindex because a
// cart, checkout or account page is per-visitor and has nothing to offer a
// search engine.
export const metadata = {
  title: "Account — Shaman Kathmandu",
  description: "Your Shaman Kathmandu account and orders.",
  robots: { index: false, follow: true },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <SiteProviders>
      <SiteShell>{children}</SiteShell>
    </SiteProviders>
  );
}
