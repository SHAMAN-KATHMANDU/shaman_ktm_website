import type { Metadata } from "next";
import { UnderConstructionPage } from "@/components/under-construction-page";
import { IS_COMING_SOON } from "@/lib/site-mode";
import { getLocale } from "@/lib/i18n/server";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { HomePage } from "@/components/site/home/home-page";
import { JsonLd } from "@/components/site/shared/json-ld";
import {
  getBrandingExtras,
  getNavConfig,
  getSiteContact,
} from "@/lib/site-content";
import { pageMetadata } from "@/lib/seo";
import {
  organizationJsonLd,
  socialProfileUrls,
  websiteJsonLd,
} from "@/lib/structured-data";

export async function generateMetadata(): Promise<Metadata> {
  // Coming-soon mode keeps the root layout's placeholder title.
  if (IS_COMING_SOON) return {};
  const locale = await getLocale();
  const branding = await getBrandingExtras();
  return pageMetadata(getDictionary(locale).seo.home, "/", locale, {
    image: branding.ogImageUrl || null,
  });
}

export default async function Page() {
  if (IS_COMING_SOON) return <UnderConstructionPage />;
  const locale = await getLocale();
  const [contact, nav, branding] = await Promise.all([
    getSiteContact(),
    getNavConfig(),
    getBrandingExtras(),
  ]);
  const organization = organizationJsonLd({
    contact,
    sameAs: socialProfileUrls(nav.footerSocials, contact.socials),
    logoUrl: branding.logoUrl,
  });
  return (
    <SiteProviders>
      <SiteShell>
        <JsonLd data={[organization, websiteJsonLd()]} />
        <HomePage locale={locale} />
      </SiteShell>
    </SiteProviders>
  );
}
