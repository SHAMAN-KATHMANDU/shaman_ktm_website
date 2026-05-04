import { Hero } from "./hero";
import { BrandStrip } from "./brand-strip";
import { FeaturedStory } from "./featured-story";
import { NewReleases } from "./new-releases";
import { ServicesPreview } from "./services-preview";
import { ElementsGrid } from "./elements-grid";
import { getNavConfig, getHomeCopy } from "@/lib/site-content";
import { getSiteModules } from "@/lib/site-modules";
import { getHomepageConfig } from "@/lib/api/server/homepage";

export async function HomePage() {
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
          media={{
            heroImage: homepageConfig.heroImage ?? null,
            heroVideoEmbedUrl: homepageConfig.heroVideoEmbedUrl ?? null,
          }}
        />
      )}
      {modules.homeBrandStrip && <BrandStrip homeCopy={homeCopy} />}
      {modules.homeFeaturedStory && <FeaturedStory nav={nav} />}
      {modules.homeNewReleases && <NewReleases nav={nav} />}
      {modules.homeServicesPreview && <ServicesPreview nav={nav} />}
      {modules.homeElementsGrid && <ElementsGrid />}
    </>
  );
}
