import { listBlogCategories, listBlogPosts, listFeaturedPosts } from "@/lib/api";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { StoriesFilter } from "./stories-filter";
import Link from "next/link";
import { PlayIcon } from "@/components/site/icons";

export const metadata = {
  title: "Shaman Stories — Shaman Kathmandu",
  description:
    "Films, conversations, and small documentaries from the makers and places behind the objects we sell.",
};

export default async function StoriesPage() {
  const [{ posts: featured }, list, categories] = await Promise.all([
    listFeaturedPosts({ limit: 1 }),
    listBlogPosts({ limit: 24 }),
    listBlogCategories(),
  ]);
  const top = featured[0];

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
            Films, <em className="text-[var(--color-gold)] not-italic">fragments</em>, and field notes
          </h1>
          <p className="text-[var(--color-cream)]/90 text-base md:text-lg max-w-2xl leading-relaxed">
            A journey by Shaman Kathmandu into the elements, the unseen forces, and the ancient wisdom of nature that has always existed within and around us.
          </p>
          <p className="mt-4 text-[var(--color-gold)] font-display text-base md:text-lg max-w-2xl leading-relaxed italic">
            शक्ति बाहिर होइन।<br />यही सृष्टिभित्र छ।
          </p>
        </section>
        <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-10">
          {top && (
            <Link
              href={`/stories/${top.slug}`}
              className="group block relative aspect-[21/9] bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden mb-12"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={top.heroImageUrl}
                alt={top.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="w-20 h-20 rounded-full border-2 border-[var(--color-gold)] flex items-center justify-center text-[var(--color-gold)] bg-black/40 group-hover:bg-[var(--color-gold)] group-hover:text-[var(--color-base)] transition-colors">
                  <PlayIcon size={28} />
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 bg-gradient-to-t from-black/80 to-transparent">
                <p className="label-eyebrow text-[var(--color-gold)] mb-2">
                  Featured · {top.category.name}
                </p>
                <h3 className="font-display text-3xl md:text-5xl text-[var(--color-cream)] leading-tight max-w-2xl">
                  {top.title}
                </h3>
              </div>
            </Link>
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
