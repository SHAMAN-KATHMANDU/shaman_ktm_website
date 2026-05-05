import { listBlogCategories, listBlogPosts } from "@/lib/api";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { StoriesFilter } from "./stories-filter";
import { getHomeCopy } from "@/lib/site-content";

export const metadata = {
  title: "Shaman Stories — Shaman Kathmandu",
  description:
    "A journey by Shaman Kathmandu into the elements, the unseen forces, and the ancient wisdom of nature.",
};

export default async function StoriesPage() {
  const [list, categories, homeCopy] = await Promise.all([
    listBlogPosts({ limit: 24 }),
    listBlogCategories(),
    getHomeCopy(),
  ]);
  const top = list.posts[0];

  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Shaman Stories" }]} />
        </section>

        {/* Banner — image only, text sits below */}
        <section className="relative w-full overflow-hidden">
          <div className="relative aspect-[21/9] md:aspect-[16/6] w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/stories-banner.jpeg"
              alt="Shaman Stories"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>
        </section>

        {/* Description below the banner */}
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] pt-12 pb-6">
          <p className="label-eyebrow text-[var(--color-gold)] mb-3">
            {homeCopy.storiesPageEyebrow}
          </p>
          <h1 className="font-display text-4xl md:text-6xl text-[var(--color-cream)] leading-tight max-w-3xl mb-6">
            {homeCopy.storiesPageHeading}
          </h1>
          {homeCopy.storiesPageSubheading && (
            <p className="text-[var(--color-cream)] text-base md:text-lg max-w-2xl leading-relaxed">
              {homeCopy.storiesPageSubheading}
            </p>
          )}
          {homeCopy.storiesPageNepaliCouplet && (
            <p className="mt-4 text-[var(--color-gold)] font-display text-base md:text-lg max-w-2xl leading-relaxed italic whitespace-pre-line">
              {homeCopy.storiesPageNepaliCouplet}
            </p>
          )}
        </section>

        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-10">
          {top?.heroVideoEmbedUrl && (
            <div className="mb-12">
              <p className="label-eyebrow text-[var(--color-gold)] mb-3">
                Featured · {top.category.name}
              </p>
              <div className="relative w-full aspect-video border border-[var(--color-border)] overflow-hidden bg-black">
                <iframe
                  src={top.heroVideoEmbedUrl}
                  title={top.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                />
              </div>
              <h3 className="mt-4 font-display text-2xl md:text-4xl text-[var(--color-cream)] leading-tight max-w-3xl">
                {top.title}
              </h3>
            </div>
          )}
          <StoriesFilter
            initialPosts={list.posts}
            categories={categories}
          />
        </section>
      </SiteShell>
    </SiteProviders>
  );
}
