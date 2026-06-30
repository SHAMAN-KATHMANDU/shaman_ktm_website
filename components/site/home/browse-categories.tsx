import { SectionHeading } from "@/components/site/shared/section-heading";
import { CategoryCarousel } from "./category-carousel";
import { getCategoriesWithLatestProducts } from "@/lib/api/server/homepage";
import { pickLocalized, type Locale } from "@/lib/i18n/locale";
import type { HomeCopy } from "@/lib/site-content";

export async function BrowseCategories({ homeCopy, locale }: { homeCopy: HomeCopy; locale: Locale }) {
  const categories = await getCategoriesWithLatestProducts();
  if (categories.length === 0) return null;
  return (
    <section className="py-20 md:py-28 px-6 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={pickLocalized(homeCopy, "categoriesEyebrow", locale)}
          title={pickLocalized(homeCopy, "categoriesHeading", locale)}
          subtitle={pickLocalized(homeCopy, "categoriesSubheading", locale) || undefined}
          className="mb-12"
        />
        <CategoryCarousel categories={categories} />
      </div>
    </section>
  );
}
