import Image from "next/image";
import { Button } from "@/components/site/shared/button";
import { ScrollDownButton } from "./scroll-down-button";
import { HeroArtWall } from "./hero-art-wall";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { pickLocalized, localizeHref, type Locale } from "@/lib/i18n/locale";
import type { NavConfig, HomeCopy } from "@/lib/site-content";
import type { ResolvedHeroTile } from "@/lib/home-hero-tiles";

interface HeroMedia {
  /** Public URL of the hero image set in /sysuser/homepage. */
  heroImage?: string | null;
  /** Embeddable YouTube/Vimeo URL set in /sysuser/homepage. */
  heroVideoEmbedUrl?: string | null;
}

function HeroCtas({
  nav,
  locale,
  secondaryVariant = "outline",
  className = "",
}: {
  nav: NavConfig;
  locale: Locale;
  /** "inverse" on ink/photo grounds, "outline" on the light legacy hero. */
  secondaryVariant?: "outline" | "inverse";
  className?: string;
}) {
  const primary = pickLocalized(nav, "heroPrimaryCta", locale);
  const secondary = pickLocalized(nav, "heroSecondaryCta", locale);
  return (
    <div className={`flex flex-col sm:flex-row items-center gap-4 ${className}`}>
      {primary.label && (
        <Button
          href={localizeHref(primary.href, locale)}
          external={primary.external}
          variant="primary"
          size="lg"
          className="w-full sm:w-auto"
        >
          {primary.label}
        </Button>
      )}
      {secondary.label && (
        <Button
          href={localizeHref(secondary.href, locale)}
          external={secondary.external}
          variant={secondaryVariant}
          size="lg"
          className="w-full sm:w-auto"
        >
          {secondary.label}
        </Button>
      )}
    </div>
  );
}

function HeroStats({
  homeCopy,
  locale,
  onInk = false,
  className = "",
}: {
  homeCopy: HomeCopy;
  locale: Locale;
  /** Bone-toned styling for the full-bleed photo hero. */
  onInk?: boolean;
  className?: string;
}) {
  const stats = pickLocalized(homeCopy, "heroStats", locale) ?? [];
  if (stats.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-x-12 gap-y-4 ${className}`}>
      {stats.map((s, i) => (
        <div key={i}>
          <strong
            className={`block font-display text-2xl md:text-3xl font-medium ${
              onInk ? "text-bone" : "text-ink"
            }`}
          >
            {s.value}
          </strong>
          <span
            className={`label-nav text-[10px] ${
              onInk ? "text-bone/60" : "text-ink-soft"
            }`}
          >
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Hero({
  nav,
  homeCopy,
  locale,
  media,
  tiles = [],
}: {
  nav: NavConfig;
  homeCopy: HomeCopy;
  locale: Locale;
  media?: HeroMedia;
  /** Framed pieces for the art wall (resolved HomepageConfig.heroTiles). */
  tiles?: ResolvedHeroTile[];
}) {
  // Hero title supports a soft line break — split on double space or "\n" so
  // editors can shape the hero without HTML.
  const titleParts = pickLocalized(homeCopy, "heroTitle", locale).split(/\s*\n\s*|\s{2,}/);
  const video = media?.heroVideoEmbedUrl?.trim();
  const image = media?.heroImage?.trim();
  const cardTitle = pickLocalized(homeCopy, "heroCardTitle", locale);
  const eyebrow = pickLocalized(homeCopy, "heroEyebrow", locale);
  const subtitle = pickLocalized(homeCopy, "heroSubtitle", locale);

  // Art-wall hero when there are tiles (or a single image) and no video
  // override: copy and CTAs on the left of a light gallery wall, four framed
  // pieces curated in /sysuser/homepage on the right. Video keeps the legacy
  // centred treatment.
  if (!video && (tiles.length > 0 || image)) {
    // One sentence per line ("Curated in Kathmandu." / "From the world." /
    // "For the world.") unless the editor shaped the title explicitly; the
    // closing line is set in italic gold.
    const lines =
      titleParts.length > 1
        ? titleParts
        : titleParts[0].split(/(?<=[.।])\s+/).filter(Boolean);
    return (
      <section
        id="home-hero"
        className="relative overflow-hidden bg-cream"
      >
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,var(--color-bone)_0%,transparent_65%)]"
          aria-hidden
        />
        {/* DOM order is the mobile order — title, art wall, then subtitle /
            CTAs / stats — so the pieces are in view on the first screen of a
            phone. On desktop the grid puts title + body back together in the
            left column (meeting in the middle) with the wall spanning the
            right. */}
        <div className="relative mx-auto w-full max-w-[1400px] px-5 sm:px-6 md:px-10 pt-8 pb-14 md:pt-16 md:pb-20 lg:py-[clamp(1.5rem,4svh,2.5rem)] lg:min-h-[calc(100svh-64px)] lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:grid-rows-[auto_auto] lg:content-center lg:gap-x-16 xl:gap-x-24 hero-load">
          <div className="max-w-xl lg:col-start-1 lg:row-start-1 lg:self-end">
            {eyebrow && <p className="label-eyebrow mb-4 md:mb-6">{eyebrow}</p>}
            {/* On desktop the title scales with screen height so the whole
                hero fits above the fold on short laptop screens. */}
            <h1 className="display-heading font-display text-[2.5rem] sm:text-5xl md:text-6xl lg:text-[clamp(2.75rem,7.5svh,4.5rem)] text-ink leading-[1.04]">
              {lines.map((part, i) =>
                i === lines.length - 1 && lines.length > 1 ? (
                  <em key={i} className="block">
                    {part}
                  </em>
                ) : (
                  <span key={i} className="block">
                    {part}
                  </span>
                ),
              )}
            </h1>
          </div>

          <div className="mt-6 mb-8 md:mt-10 md:mb-10 lg:my-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-center">
            {tiles.length > 0 ? (
              <HeroArtWall
                tiles={tiles}
                locale={locale}
                viewLabel={getDictionary(locale).common.view}
              />
            ) : (
              <div className="bg-surface border border-line rounded-card p-2 md:p-3 shadow-card">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-cream">
                  <Image
                    src={image as string}
                    alt={cardTitle || ""}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    className="object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="max-w-xl lg:col-start-1 lg:row-start-2 lg:self-start">
            <div className="w-16 h-px bg-metal my-[clamp(1rem,3svh,1.75rem)] hidden lg:block" aria-hidden />
            {subtitle && (
              <p className="text-ink-soft text-base sm:text-lg md:text-xl leading-relaxed">
                {subtitle}
              </p>
            )}
            <HeroCtas
              nav={nav}
              locale={locale}
              className="mt-7 md:mt-9 lg:mt-[clamp(1.25rem,4svh,2.25rem)] sm:justify-start items-stretch sm:items-center"
            />
            <HeroStats
              homeCopy={homeCopy}
              locale={locale}
              className="mt-10 pt-6 lg:mt-[clamp(1.5rem,4.5svh,2.5rem)] lg:pt-[clamp(1rem,2.5svh,1.5rem)] border-t border-line"
            />
          </div>
        </div>

        <div
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-metal-text to-transparent opacity-30"
          aria-hidden
        />
      </section>
    );
  }

  return (
    <section
      id="home-hero"
      className="hero-bg relative min-h-[calc(100svh-64px)] flex items-center justify-center px-6 overflow-hidden"
    >
      {video ? (
        <iframe
          src={video}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          title="Hero background"
          allow="autoplay; encrypted-media"
          aria-hidden
        />
      ) : null}
      {video && (
        <div
          className="absolute inset-0 bg-black/55"
          aria-hidden
        />
      )}
      <div className="text-center max-w-4xl relative z-10 hero-load">
        {eyebrow && (
          <p className="label-eyebrow mb-6">{eyebrow}</p>
        )}
        <h1 className="display-heading font-display text-5xl md:text-7xl lg:text-8xl text-ink leading-[1.05]">
          {titleParts.map((part, i) => (
            <span key={i} className="block">
              {part}
            </span>
          ))}
        </h1>
        <div className="w-16 h-px bg-metal-tint mx-auto my-8" aria-hidden />
        {subtitle && (
          <p className="text-ink-soft text-lg md:text-xl">
            {subtitle}
          </p>
        )}
        <HeroCtas nav={nav} locale={locale} className="mt-12 justify-center" />
        <HeroStats homeCopy={homeCopy} locale={locale} className="mt-12 justify-center" />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-metal-text to-transparent opacity-30"
        aria-hidden
      />
      <ScrollDownButton label={getDictionary(locale).common.scrollDown} />
    </section>
  );
}
