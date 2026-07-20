import Image from "next/image";
import { Button } from "@/components/site/shared/button";
import { ScrollDownButton } from "./scroll-down-button";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { pickLocalized, localizeHref, type Locale } from "@/lib/i18n/locale";
import type { NavConfig, HomeCopy } from "@/lib/site-content";

interface HeroMedia {
  /** Public URL of the hero image set in /sysuser/homepage. */
  heroImage?: string | null;
  /** Embeddable YouTube/Vimeo URL set in /sysuser/homepage. */
  heroVideoEmbedUrl?: string | null;
}

function HeroCtas({
  nav,
  locale,
  className = "",
}: {
  nav: NavConfig;
  locale: Locale;
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
        >
          {primary.label}
        </Button>
      )}
      {secondary.label && (
        <Button
          href={localizeHref(secondary.href, locale)}
          external={secondary.external}
          variant="outline"
          size="lg"
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
  className = "",
}: {
  homeCopy: HomeCopy;
  locale: Locale;
  className?: string;
}) {
  const stats = pickLocalized(homeCopy, "heroStats", locale) ?? [];
  if (stats.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-8 ${className}`}>
      {stats.map((s, i) => (
        <div key={i}>
          <strong className="block font-display text-2xl md:text-3xl text-[var(--color-cream)] font-medium">
            {s.value}
          </strong>
          <span className="label-nav text-[10px] text-[var(--color-gold-muted)]">
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
}: {
  nav: NavConfig;
  homeCopy: HomeCopy;
  locale: Locale;
  media?: HeroMedia;
}) {
  // Hero title supports a soft line break — split on double space or "\n" so
  // editors can shape the hero without HTML.
  const titleParts = pickLocalized(homeCopy, "heroTitle", locale).split(/\s*\n\s*|\s{2,}/);
  const video = media?.heroVideoEmbedUrl?.trim();
  const image = media?.heroImage?.trim();
  const chipTopLeft = pickLocalized(homeCopy, "heroChipTopLeft", locale);
  const chipBottomRight = pickLocalized(homeCopy, "heroChipBottomRight", locale);

  // Split layout (copy + framed product visual) when a hero image is set and
  // no video override. Video keeps the legacy full-bleed treatment.
  if (image && !video) {
    return (
      <section
        id="home-hero"
        className="hero-bg relative overflow-hidden px-6 md:px-10"
      >
        <div className="mx-auto max-w-[1400px] grid gap-12 lg:grid-cols-[1.05fr_0.95fr] items-center py-16 md:py-24 lg:py-28">
          <div>
            {pickLocalized(homeCopy, "heroEyebrow", locale) && (
              <p className="label-eyebrow mb-6">
                {pickLocalized(homeCopy, "heroEyebrow", locale)}
              </p>
            )}
            <h1 className="display-heading font-display text-4xl md:text-6xl lg:text-7xl text-[var(--color-cream)] leading-[1.05]">
              {titleParts.map((part, i) => (
                <span key={i} className="block">
                  {part}
                </span>
              ))}
            </h1>
            {pickLocalized(homeCopy, "heroSubtitle", locale) && (
              <p className="mt-6 text-[var(--color-gold-muted)] text-lg md:text-xl max-w-xl leading-relaxed">
                {pickLocalized(homeCopy, "heroSubtitle", locale)}
              </p>
            )}
            <HeroCtas nav={nav} locale={locale} className="mt-10 sm:justify-start items-start" />
            <HeroStats homeCopy={homeCopy} locale={locale} className="mt-12" />
          </div>

          <div className="relative max-w-[520px] w-full mx-auto lg:mx-0">
            <div className="relative bg-[var(--color-cream)] aspect-[4/4.6] flex items-center justify-center p-[8%]">
              <div
                className="absolute inset-3.5 border border-[var(--color-base)]/20 pointer-events-none"
                aria-hidden
              />
              <Image
                src={image}
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 520px"
                className="object-contain p-[8%]"
              />
            </div>
            {chipTopLeft && (
              <span className="absolute top-6 -left-3 label-nav text-[10px] bg-[var(--color-base)] border border-[var(--color-gold)] text-[var(--color-gold)] px-4 py-3">
                {chipTopLeft}
              </span>
            )}
            {chipBottomRight && (
              <span className="absolute bottom-8 -right-3 label-nav text-[10px] bg-[var(--color-gold)] text-[var(--color-base)] px-4 py-3">
                {chipBottomRight}
              </span>
            )}
          </div>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-30"
          aria-hidden
        />
      </section>
    );
  }

  return (
    <section
      id="home-hero"
      className="hero-bg relative min-h-[calc(100vh-64px)] flex items-center justify-center px-6 overflow-hidden"
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
      <div className="text-center max-w-4xl relative z-10">
        {pickLocalized(homeCopy, "heroEyebrow", locale) && (
          <p className="label-eyebrow mb-6">{pickLocalized(homeCopy, "heroEyebrow", locale)}</p>
        )}
        <h1 className="display-heading font-display text-5xl md:text-7xl lg:text-8xl text-[var(--color-cream)] leading-[1.05]">
          {titleParts.map((part, i) => (
            <span key={i} className="block">
              {part}
            </span>
          ))}
        </h1>
        <div className="w-16 h-px bg-[var(--color-gold)] mx-auto my-8" aria-hidden />
        {pickLocalized(homeCopy, "heroSubtitle", locale) && (
          <p className="text-[var(--color-gold-muted)] text-lg md:text-xl">
            {pickLocalized(homeCopy, "heroSubtitle", locale)}
          </p>
        )}
        <HeroCtas nav={nav} locale={locale} className="mt-12 justify-center" />
        <HeroStats homeCopy={homeCopy} locale={locale} className="mt-12 justify-center" />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-30"
        aria-hidden
      />
      <ScrollDownButton label={getDictionary(locale).common.scrollDown} />
    </section>
  );
}
