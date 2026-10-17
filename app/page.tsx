import { UnderConstructionPage } from "@/components/under-construction-page";
import { IS_COMING_SOON } from "@/lib/site-mode";
import { getLocale } from "@/lib/i18n/server";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { HomePage } from "@/components/site/home/home-page";
import { JsonLd } from "@/components/site/shared/json-ld";
import { getNavConfig, getBrandingExtras } from "@/lib/site-content";
import { siteUrl } from "@/lib/seo";
import { absoluteUrl } from "@/lib/image";

const SITE_NAME = "Shaman Kathmandu";

// Organization + WebSite markup: tells search engines which brand the site
// belongs to (knowledge panel, logo, linked social profiles) and its name in
// results. Showroom-level LocalBusiness markup lives on /contact.
async function buildSiteJsonLd() {
  const [nav, branding] = await Promise.all([getNavConfig(), getBrandingExtras()]);
  const sameAs = nav.footerSocials
    .map((s) => s.href.trim())
    .filter((href) => /^https?:\/\//i.test(href));
  return [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: SITE_NAME,
      url: `${siteUrl}/`,
      logo: absoluteUrl(branding.logoUrl) ?? `${siteUrl}/icon.png`,
      ...(sameAs.length > 0 ? { sameAs } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: SITE_NAME,
      url: `${siteUrl}/`,
      inLanguage: ["en", "ne"],
      publisher: { "@id": `${siteUrl}/#organization` },
    },
  ];
}

export default async function Page() {
  if (IS_COMING_SOON) return <UnderConstructionPage />;
  const [locale, siteJsonLd] = await Promise.all([getLocale(), buildSiteJsonLd()]);
  return (
    <SiteProviders>
      <SiteShell>
        <JsonLd data={siteJsonLd} />
        <HomePage locale={locale} />
      </SiteShell>
    </SiteProviders>
  );
}
