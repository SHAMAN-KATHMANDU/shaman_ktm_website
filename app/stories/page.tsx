import { listBlogCategories, listBlogPosts } from "@/lib/api";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { StoriesFilter } from "./stories-filter";

export const metadata = {
  title: "Shaman Stories — Shaman Kathmandu",
  description:
    "A journey by Shaman Kathmandu into the elements, the unseen forces, and the ancient wisdom of nature.",
};

const FEATURED_YT_ID = "hG-fY8LdHBw";

export default async function StoriesPage() {
  const [list, categories] = await Promise.all([
    listBlogPosts({ limit: 24 }),
    listBlogCategories(),
  ]);

  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Shaman Stories" }]} />
        </section>
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
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] pt-12 pb-6">
          <p className="label-eyebrow text-[var(--color-gold)] mb-3">
            Shaman Stories
          </p>
          <h1 className="font-display text-4xl md:text-6xl text-[var(--color-cream)] leading-tight max-w-3xl mb-6">
            A return to the <em className="text-[var(--color-gold)] not-italic">elements</em>
          </h1>
          <p className="text-[var(--color-cream)]/90 text-base md:text-lg max-w-2xl leading-relaxed">
            A journey by Shaman Kathmandu into the elements, the unseen forces, and the ancient wisdom of nature that has always existed within and around us.
          </p>
          <p className="mt-4 text-[var(--color-gold)] font-display text-base md:text-lg max-w-2xl leading-relaxed italic">
            शक्ति बाहिर होइन।<br />यही सृष्टिभित्र छ।
          </p>
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-10">
          <div className="mb-12">
            <p className="label-eyebrow text-[var(--color-gold)] mb-3">
              Featured · Episode 01
            </p>
            <div className="relative w-full aspect-video border border-[var(--color-border)] overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${FEATURED_YT_ID}`}
                title="Shaman Stories — Episode 01: The Origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>
          <StoriesFilter
            initialPosts={list.posts}
            categories={categories}
          />
        </section>
      </SiteShell>
    </SiteProviders>
  );
}
