import { SectionHeading } from "@/components/site/shared/section-heading";
import { CategoryCarousel } from "./category-carousel";
import { getCategoriesWithLatestProducts } from "@/lib/api/server/homepage";
import type { HomeCopy } from "@/lib/site-content";

export async function BrowseCategories({ homeCopy }: { homeCopy: HomeCopy }) {
  const categories = await getCategoriesWithLatestProducts();
  if (categories.length === 0) return null;
  return (
    <section className="py-20 md:py-28 px-6 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={homeCopy.categoriesEyebrow}
          title={homeCopy.categoriesHeading}
          subtitle={homeCopy.categoriesSubheading || undefined}
          className="mb-12"
        />
        <CategoryCarousel categories={categories} />
      </div>
    </section>
  );
}
