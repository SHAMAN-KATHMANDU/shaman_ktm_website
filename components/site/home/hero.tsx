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
  const cardTitle = pickLocalized(homeCopy, "heroCardTitle", locale);
  const cardBody = pickLocalized(homeCopy, "heroCardBody", locale);
  const eyebrow = pickLocalized(homeCopy, "heroEyebrow", locale);
  const subtitle = pickLocalized(homeCopy, "heroSubtitle", locale);

  // Immersive full-bleed hero when an image is set and no video override: the
  // CMS photo runs edge to edge under an ink scrim; copy sits on the darkest
  // zones so any upload stays legible. Video keeps the legacy treatment.
  if (image && !video) {
    return (
      <section
        id="home-hero"
        className="relative min-h-[calc(100vh-64px)] flex flex-col justify-end overflow-hidden bg-ink"
      >
        <Image
          src={image}
          alt={cardTitle || ""}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(36,48,43,0.20)_0%,rgba(36,48,43,0.35)_45%,rgba(36,48,43,0.72)_78%,rgba(36,48,43,0.88)_100%)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 hidden lg:block bg-[linear-gradient(90deg,rgba(36,48,43,0.45)_0%,transparent_55%)]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 md:px-10 pt-32 md:pt-36 pb-10 md:pb-14 hero-load">
          <div className="lg:grid lg:grid-cols-[1.2fr_0.8fr] lg:items-end lg:gap-10">
            <div>
              {eyebrow && (
                <p className="label-nav text-[10px] tracking-[3px] uppercase text-bone/70 mb-6">
                  {eyebrow}
                </p>
              )}
              <h1 className="display-heading font-display text-5xl md:text-6xl lg:text-7xl text-bone leading-[1.04] max-w-3xl">
                {titleParts.map((part, i) => (
                  <span key={i} className="block">
                    {part}
                  </span>
                ))}
              </h1>
              {subtitle && (
                <p className="mt-5 text-bone/85 text-lg md:text-xl max-w-xl leading-relaxed">
                  {subtitle}
                </p>
              )}
              <HeroCtas
                nav={nav}
                locale={locale}
                secondaryVariant="inverse"
                className="mt-8 sm:justify-start items-stretch sm:items-center"
              />
            </div>

            {(cardTitle || cardBody) && (
              <aside className="mt-10 lg:mt-0 border-l border-metal/60 bg-ink/30 backdrop-blur-sm pl-5 md:pl-6 py-4 pr-5 md:pr-6 max-w-sm lg:justify-self-end">
                {cardTitle && (
                  <span className="block font-display text-2xl text-bone leading-tight">
                    {cardTitle}
                  </span>
                )}
                {cardBody && (
                  <>
                    <div className="w-10 h-px bg-metal/70 my-3 hidden md:block" aria-hidden />
                    <p className="hidden md:block text-sm leading-relaxed text-bone/75">
                      {cardBody}
                    </p>
                  </>
                )}
              </aside>
            )}
          </div>

          <div className="mt-10 md:mt-12 border-t border-bone/20 pt-6">
            <HeroStats homeCopy={homeCopy} locale={locale} onInk />
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
