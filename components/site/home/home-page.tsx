import { Hero } from "./hero";
import { BrandStrip } from "./brand-strip";
import { FeaturedStory } from "./featured-story";
import { NewReleases } from "./new-releases";
import { ServicesPreview } from "./services-preview";
import { ElementsGrid } from "./elements-grid";

export async function HomePage() {
  return (
    <>
      <Hero />
      <BrandStrip />
      <FeaturedStory />
      <NewReleases />
      <ServicesPreview />
      <ElementsGrid />
    </>
  );
}
