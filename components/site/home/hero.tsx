import Link from "next/link";
import { Button } from "@/components/site/shared/button";
import type { NavConfig, HomeCopy } from "@/lib/site-content";

export function Hero({ nav, homeCopy }: { nav: NavConfig; homeCopy: HomeCopy }) {
  // Hero title supports a soft line break — split on double space or "\n" so
  // editors can shape the hero without HTML.
  const titleParts = homeCopy.heroTitle.split(/\s*\n\s*|\s{2,}/);

  return (
    <section className="hero-bg relative min-h-[calc(100vh-64px)] flex items-center justify-center px-6 overflow-hidden">
      <div className="text-center max-w-4xl relative z-10">
        {homeCopy.heroEyebrow && (
          <p className="label-eyebrow mb-6">{homeCopy.heroEyebrow}</p>
        )}
        <h1 className="display-heading font-display text-5xl md:text-7xl lg:text-8xl text-[var(--color-cream)] leading-[1.05]">
          {titleParts.map((part, i) => (
            <span key={i} className="block">
              {part}
            </span>
          ))}
        </h1>
        <div className="w-16 h-px bg-[var(--color-gold)] mx-auto my-8" aria-hidden />
        {homeCopy.heroSubtitle && (
          <p className="text-[var(--color-gold-muted)] text-lg md:text-xl">
            {homeCopy.heroSubtitle}
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
      {nav.heroScrollHref && (
        <Link
          href={nav.heroScrollHref}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 label-nav text-[10px] text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
        >
          Scroll ↓
        </Link>
      )}
    </section>
  );
}
