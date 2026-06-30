import type { Locale } from "@/lib/i18n/locale";
import { Hero } from "./hero";
import { BrandStrip } from "./brand-strip";
import { BrowseCategories } from "./browse-categories";
import { FeaturedStory } from "./featured-story";
import { FeaturedProducts } from "./featured-products";
import { NewReleases } from "./new-releases";
import { ServicesPreview } from "./services-preview";
import { ElementsGrid } from "./elements-grid";
import { getNavConfig, getHomeCopy } from "@/lib/site-content";
import { getSiteModules } from "@/lib/site-modules";
import { getHomepageConfig } from "@/lib/api/server/homepage";

interface Props {
  locale: Locale;
}

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
      {modules.homeBrandStrip && <BrandStrip homeCopy={homeCopy} locale={locale} />}
      {modules.homeCategories && <BrowseCategories homeCopy={homeCopy} locale={locale} />}
      {modules.homeFeaturedStory && <FeaturedStory nav={nav} homeCopy={homeCopy} locale={locale} />}
      {modules.homeNewReleases && <NewReleases nav={nav} homeCopy={homeCopy} locale={locale} />}
      {modules.homeFeaturedProducts && <FeaturedProducts nav={nav} homeCopy={homeCopy} locale={locale} />}
      {modules.homeServicesPreview && <ServicesPreview nav={nav} homeCopy={homeCopy} locale={locale} />}
      {modules.homeElementsGrid && <ElementsGrid homeCopy={homeCopy} locale={locale} />}
    </>
  );
}
