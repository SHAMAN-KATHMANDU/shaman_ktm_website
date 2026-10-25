import Image from "next/image";
import Link from "next/link";
import { localizeHref, type Locale } from "@/lib/i18n/locale";
import type { ResolvedHeroTile } from "@/lib/home-hero-tiles";

// The hero's right column: up to four framed pieces hung salon-style on the
// gallery wall. Each frame reuses the product-card language (surface, line
// border, metal on hover, 3:4 portrait) with a bone mat around the photo so
// it reads as art rather than a listing. 4:5 frames (a touch squarer than
// the 3:4 cards) keep the whole wall above the fold. The second column drops a step on
// desktop for the staggered hang.
export function HeroArtWall({
  tiles,
  locale,
  viewLabel,
}: {
  tiles: ResolvedHeroTile[];
  locale: Locale;
  viewLabel: string;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:pb-10 lg:max-w-[580px] lg:ml-auto">
      {tiles.map((tile, i) => (
        <li key={`${tile.href}-${i}`} className={i % 2 === 1 ? "lg:translate-y-10" : ""}>
          <Link
            href={localizeHref(tile.href, locale)}
            className="group block bg-surface border border-line hover:border-metal rounded-card p-2 md:p-3 shadow-card transition-all duration-500 hover:-translate-y-1"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-cream ring-1 ring-inset ring-line/70">
              <Image
                src={tile.imageUrl}
                alt={tile.label}
                fill
                priority={i < 2}
                sizes="(max-width: 1024px) 50vw, 290px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="flex items-baseline justify-between gap-3 px-1 pt-3 pb-1">
              <span className="font-display text-base md:text-lg leading-tight text-ink line-clamp-2 sm:line-clamp-1">
                {tile.label}
              </span>
              <span className="hidden sm:inline shrink-0 label-nav text-[10px] text-metal-text transition-transform duration-300 group-hover:translate-x-0.5">
                {viewLabel} →
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
