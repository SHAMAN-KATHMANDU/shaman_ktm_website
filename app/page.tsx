import { UnderConstructionPage } from "@/components/under-construction-page";
import { IS_COMING_SOON } from "@/lib/site-mode";
import { getLocale } from "@/lib/i18n/server";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { HomePage } from "@/components/site/home/home-page";

export default async function Page() {
  if (IS_COMING_SOON) return <UnderConstructionPage />;
  const locale = await getLocale();
  return (
    <SiteProviders>
      <SiteShell>
        <HomePage locale={locale} />
      </SiteShell>
    </SiteProviders>
  );
}
