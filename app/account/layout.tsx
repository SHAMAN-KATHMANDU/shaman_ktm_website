import type { ReactNode } from "react";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";

// The shell lives in a LAYOUT, not in the pages below it, because SiteShell is
// an async server component: it queries the database for nav/showrooms and
// reads the locale from request headers. The pages in this segment are
// "use client", and a client component cannot render a server one — doing so
// threw `headers` was called outside a request scope at runtime and dropped
// every account page into the error boundary.
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <SiteProviders>
      <SiteShell>{children}</SiteShell>
    </SiteProviders>
  );
}
