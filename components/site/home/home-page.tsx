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
import { getNavConfig, getHomeCopy } from "@/lib/site-content";
import { getSiteModules } from "@/lib/site-modules";
import { getHomepageConfig } from "@/lib/api/server/homepage";

interface Props {
  locale: Locale;
}

// Section order mirrors the 2026 homepage template (The Citizenry structure):
// hero → tagline → categories → offers → campaign rail → members-first new
// releases → clearance → story → elements → featured/services → trust band →
// who we are → member circle. Every section is gated by its module flag.
export async function HomePage({ locale }: Props) {
  const [nav, homeCopy, modules, homepageConfig] = await Promise.all([
    getNavConfig(),
    getHomeCopy(),
    getSiteModules(),
    getHomepageConfig(),
  ]);
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
      {modules.homeTagline && <TaglineStrip homeCopy={homeCopy} locale={locale} />}
      {modules.homeBrandStrip && <BrandStrip homeCopy={homeCopy} locale={locale} />}
      {modules.homeCategories && <BrowseCategories homeCopy={homeCopy} locale={locale} />}
      {modules.homeOffers && <OffersGrid homeCopy={homeCopy} locale={locale} />}
      {modules.homeCampaignRail && <CampaignRail homeCopy={homeCopy} locale={locale} />}
      {modules.homeNewReleases && <NewReleases nav={nav} homeCopy={homeCopy} locale={locale} />}
      {modules.homeClearance && <ClearanceSection homeCopy={homeCopy} locale={locale} />}
      {modules.homeFeaturedStory && <FeaturedStory nav={nav} homeCopy={homeCopy} locale={locale} />}
      {modules.homeElementsGrid && <ElementsGrid homeCopy={homeCopy} locale={locale} />}
      {modules.homeFeaturedProducts && <FeaturedProducts nav={nav} homeCopy={homeCopy} locale={locale} />}
      {modules.homeServicesPreview && <ServicesPreview nav={nav} homeCopy={homeCopy} locale={locale} />}
      {modules.homeTrustBand && <TrustBand homeCopy={homeCopy} locale={locale} />}
      {modules.homeWhoWeAre && <WhoWeAre homeCopy={homeCopy} locale={locale} />}
      {modules.homeMemberCircle && <MemberCircle homeCopy={homeCopy} locale={locale} />}
    </>
  );
}
