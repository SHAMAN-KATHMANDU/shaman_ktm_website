import Link from "next/link";
import { SectionHeading } from "@/components/site/shared/section-heading";
import { Button } from "@/components/site/shared/button";
import { getCuratedFeaturedPosts } from "@/lib/api/server/homepage";
import { pickLocalized, localizeHref, type Locale } from "@/lib/i18n/locale";
import type { NavConfig, HomeCopy } from "@/lib/site-content";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function FeaturedStory({
  nav,
  homeCopy,
  locale,
}: {
  nav: NavConfig;
  homeCopy: HomeCopy;
  locale: Locale;
}) {
  const posts = await getCuratedFeaturedPosts(4);
  if (posts.length === 0) return null;
  const [latest, ...rest] = posts;

  return (
    <section className="py-20 md:py-28 px-6 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <SectionHeading
          eyebrow={pickLocalized(homeCopy, "featuredStoryEyebrow", locale)}
          title={pickLocalized(homeCopy, "featuredStoryHeading", locale)}
          subtitle={pickLocalized(homeCopy, "featuredStorySubheading", locale) || undefined}
          className="mb-12"
        />

        <div className="mb-4">
          <div className="relative w-full aspect-video border border-[var(--color-border)] overflow-hidden bg-black">
            {latest.heroVideoEmbedUrl ? (
              <iframe
                src={latest.heroVideoEmbedUrl}
                title={latest.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              <Link
                href={localizeHref(`/stories/${latest.slug}`, locale)}
                className="block w-full h-full"
                aria-label={latest.title}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={latest.heroImageUrl}
                  alt={latest.title}
                  className="w-full h-full object-cover"
                />
              </Link>
            )}
          </div>
        </div>
        <div className="mb-12">
          <p className="label-eyebrow text-[var(--color-gold)] mb-2">
            Featured · {latest.category.name}
          </p>
          <Link href={localizeHref(`/stories/${latest.slug}`, locale)} className="group inline-block">
            <h3 className="font-display text-2xl md:text-4xl text-[var(--color-cream)] leading-tight max-w-3xl group-hover:text-[var(--color-gold)] transition-colors">
              {latest.title}
            </h3>
          </Link>
        </div>

        {rest.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {rest.map((p) => (
              <Link
                key={p.id}
                href={localizeHref(`/stories/${p.slug}`, locale)}
                className="group block bg-[var(--color-surface)] border border-[var(--color-border-soft)] hover:border-[var(--color-gold)] transition-colors"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--color-surface-2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.heroImageUrl}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-5">
                  <p className="label-eyebrow text-[var(--color-gold-muted)] mb-2">
                    {p.category.name} · {fmtDate(p.publishedAt)}
                  </p>
                  <h4 className="font-display text-xl text-[var(--color-cream)] leading-tight group-hover:text-[var(--color-gold)] transition-colors">
                    {p.title}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        )}

        {pickLocalized(nav, "storiesAllCta", locale).label && (
          <div className="text-center">
            <Button
              href={localizeHref(pickLocalized(nav, "storiesAllCta", locale).href, locale)}
              external={pickLocalized(nav, "storiesAllCta", locale).external}
              variant="outline"
            >
              {pickLocalized(nav, "storiesAllCta", locale).label}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
