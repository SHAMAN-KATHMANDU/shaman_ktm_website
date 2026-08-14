import type { Locale } from "@/lib/i18n/locale";
import { Hero } from "./hero";
import { BrandStrip } from "./brand-strip";
import { TaglineStrip } from "./tagline-strip";
import { BrowseCategories } from "./browse-categories";
import { OffersGrid } from "./offers-grid";
import { CampaignRail } from "./campaign-rail";
import { FeaturedStory } from "./featured-story";
import { FeaturedProducts } from "./featured-products";
import { NewReleases } from "./new-releases";
import { ClearanceSection } from "./clearance-section";
import { ServicesPreview } from "./services-preview";
import { ElementsGrid } from "./elements-grid";
import { TrustBand } from "./trust-band";
import { WhoWeAre } from "./who-we-are";
import { MemberCircle } from "./member-circle";
import { ScrollReveal } from "@/components/site/shared/scroll-reveal";
import { getNavConfig, getHomeCopy } from "@/lib/site-content";
import { getSiteModules } from "@/lib/site-modules";
import { getHomepageConfig } from "@/lib/api/server/homepage";

interface Props {
  locale: Locale;
}

// Section order mirrors the 2026 homepage template (The Citizenry structure),
// with new releases promoted to sit directly under the hero: hero → new
// releases → tagline → categories → offers → campaign rail → clearance →
// story → elements → featured/services → trust band → who we are → member
// circle. Every section is gated by its module flag.
export async function HomePage({ locale }: Props) {
  const [nav, homeCopy, modules, homepageConfig] = await Promise.all([
    getNavConfig(),
    getHomeCopy(),
    getSiteModules(),
    getHomepageConfig(),
  ]);
  const accents = homepageConfig.sectionAccents ?? {};
  return (
    <>
      {modules.homeHero && (
        <Hero
          nav={nav}
          homeCopy={homeCopy}
          locale={locale}
          media={{
            heroImage: homepageConfig.heroImage ?? null,
            heroVideoEmbedUrl: homepageConfig.heroVideoEmbedUrl ?? null,
          }}
        />
      )}
      {modules.homeNewReleases && <div data-reveal><NewReleases nav={nav} homeCopy={homeCopy} locale={locale} /></div>}
      {modules.homeTagline && <div data-reveal><TaglineStrip homeCopy={homeCopy} locale={locale} /></div>}
      {modules.homeBrandStrip && <div data-reveal><BrandStrip homeCopy={homeCopy} locale={locale} /></div>}
      {modules.homeCategories && <div data-reveal><BrowseCategories homeCopy={homeCopy} locale={locale} /></div>}
      {modules.homeOffers && <div data-reveal><OffersGrid homeCopy={homeCopy} locale={locale} accent={accents.offers} /></div>}
      {modules.homeCampaignRail && <div data-reveal><CampaignRail homeCopy={homeCopy} locale={locale} accent={accents.campaign} /></div>}
      {modules.homeClearance && <div data-reveal><ClearanceSection homeCopy={homeCopy} locale={locale} accent={accents.clearance} /></div>}
      {modules.homeFeaturedStory && <div data-reveal><FeaturedStory nav={nav} homeCopy={homeCopy} locale={locale} /></div>}
      {modules.homeElementsGrid && <div data-reveal><ElementsGrid homeCopy={homeCopy} locale={locale} /></div>}
      {modules.homeFeaturedProducts && <div data-reveal><FeaturedProducts nav={nav} homeCopy={homeCopy} locale={locale} /></div>}
      {modules.homeServicesPreview && <div data-reveal><ServicesPreview nav={nav} homeCopy={homeCopy} locale={locale} /></div>}
      {modules.homeTrustBand && <div data-reveal><TrustBand homeCopy={homeCopy} locale={locale} accent={accents.trust} /></div>}
      {modules.homeWhoWeAre && <div data-reveal><WhoWeAre homeCopy={homeCopy} locale={locale} accent={accents.who} /></div>}
      {modules.homeMemberCircle && <div data-reveal><MemberCircle homeCopy={homeCopy} locale={locale} accent={accents.memberCircle} /></div>}
      <ScrollReveal />
    </>
  );
}
