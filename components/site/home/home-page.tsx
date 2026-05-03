import { Hero } from "./hero";
import { BrandStrip } from "./brand-strip";
import { FeaturedStory } from "./featured-story";
import { NewReleases } from "./new-releases";
import { ServicesPreview } from "./services-preview";
import { ElementsGrid } from "./elements-grid";
import { getNavConfig } from "@/lib/site-content";
import { getSiteModules } from "@/lib/site-modules";

export async function HomePage() {
  const [nav, modules] = await Promise.all([
    getNavConfig(),
    getSiteModules(),
  ]);
  return (
    <>
      {modules.homeHero && <Hero nav={nav} />}
      {modules.homeBrandStrip && <BrandStrip />}
      {modules.homeFeaturedStory && <FeaturedStory nav={nav} />}
      {modules.homeNewReleases && <NewReleases nav={nav} />}
      {modules.homeServicesPreview && <ServicesPreview nav={nav} />}
      {modules.homeElementsGrid && <ElementsGrid />}
    </>
  );
}
