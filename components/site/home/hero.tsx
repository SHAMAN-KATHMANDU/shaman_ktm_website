import Image from "next/image";
import { Button } from "@/components/site/shared/button";
import { ScrollDownButton } from "./scroll-down-button";
import { pickLocalized, type Locale } from "@/lib/i18n/locale";
import type { NavConfig, HomeCopy } from "@/lib/site-content";

interface HeroMedia {
  /** Public URL of the hero background image set in /sysuser/homepage. */
  heroImage?: string | null;
  /** Embeddable YouTube/Vimeo URL set in /sysuser/homepage. */
  heroVideoEmbedUrl?: string | null;
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
      ) : image ? (
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      ) : null}
      {(video || image) && (
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
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
          {nav.heroPrimaryCta.label && (
            <Button
              href={nav.heroPrimaryCta.href}
              external={nav.heroPrimaryCta.external}
              variant="primary"
              size="lg"
            >
              {nav.heroPrimaryCta.label}
            </Button>
          )}
          {nav.heroSecondaryCta.label && (
            <Button
              href={nav.heroSecondaryCta.href}
              external={nav.heroSecondaryCta.external}
              variant="outline"
              size="lg"
            >
              {nav.heroSecondaryCta.label}
            </Button>
          )}
        </div>
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent opacity-30"
        aria-hidden
      />
      <ScrollDownButton />
    </section>
  );
}
