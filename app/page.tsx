import { UnderConstructionPage } from "@/components/under-construction-page";
import { IS_COMING_SOON } from "@/lib/site-mode";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { HomePage } from "@/components/site/home/home-page";

export default function Page() {
  if (IS_COMING_SOON) return <UnderConstructionPage />;
  return (
    <SiteProviders>
      <SiteShell>
        <HomePage />
      </SiteShell>
    </SiteProviders>
  );
}
