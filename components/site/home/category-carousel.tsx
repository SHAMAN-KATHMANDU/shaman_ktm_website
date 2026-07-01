"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CategoryPreview } from "@/lib/api/server/homepage";

export function CategoryCarousel({
  categories,
}: {
  categories: CategoryPreview[];
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const update = () => {
      setCanPrev(track.scrollLeft > 4);
      setCanNext(track.scrollLeft < track.scrollWidth - track.clientWidth - 4);
    };
    update();
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [categories.length]);

  const scrollByPage = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={trackRef}
        role="region"
        aria-label="Product categories"
        className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>

      <ArrowButton
        dir={-1}
        enabled={canPrev}
        onClick={() => scrollByPage(-1)}
      />
      <ArrowButton dir={1} enabled={canNext} onClick={() => scrollByPage(1)} />
    </div>
  );
}

function CategoryCard({ category }: { category: CategoryPreview }) {
  const images = category.productImages.slice(0, 4);
  // Only show the 2x2 collage when there are 4 product photos; otherwise show
  // a single image (the category's own image, falling back to a product photo).
  const showCollage = images.length >= 4;
  const single = category.imageUrl ?? images[0] ?? null;
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group snap-start shrink-0 w-[78%] sm:w-[46%] lg:w-[31.5%] block bg-[var(--color-surface)] border border-[var(--color-border-soft)] hover:border-[var(--color-gold)] transition-all hover:-translate-y-1"
    >
      {showCollage ? (
        <div className="grid grid-cols-2 gap-px bg-[var(--color-border-soft)] aspect-square overflow-hidden">
          {images.map((url, i) => (
            <div
              key={i}
              className="relative overflow-hidden bg-[var(--color-surface-2)]"
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="(max-width: 640px) 40vw, (max-width: 1024px) 23vw, 220px"
                loading="lazy"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative aspect-square overflow-hidden bg-[var(--color-surface-2)]">
          {single ? (
            <Image
              src={single}
              alt=""
              fill
              sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 440px"
              loading="lazy"
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div
              aria-hidden
              className="flex h-full items-center justify-center text-[var(--color-border)] text-3xl"
            >
              ✦
            </div>
          )}
        </div>
      )}
      <div className="p-4 flex items-center justify-between">
        <h3 className="font-display text-lg leading-tight text-[var(--color-cream)]">
          {category.name}
        </h3>
        <span className="label-nav text-[10px] text-[var(--color-gold-muted)]">
          {category.productCount}{" "}
          {category.productCount === 1 ? "object" : "objects"}
        </span>
      </div>
    </Link>
  );
}

function ArrowButton({
  dir,
  enabled,
  onClick,
}: {
  dir: 1 | -1;
  enabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={dir === 1 ? "Next categories" : "Previous categories"}
      onClick={onClick}
      disabled={!enabled}
      className={`absolute top-1/2 -translate-y-1/2 ${
        dir === 1 ? "-right-3 md:-right-5" : "-left-3 md:-left-5"
      } hidden sm:flex h-10 w-10 items-center justify-center rounded-full border bg-[var(--color-base)]/80 backdrop-blur transition-all ${
        enabled
          ? "border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[var(--color-base)] cursor-pointer"
          : "border-[var(--color-border)] text-[var(--color-border)] opacity-40 cursor-default"
      }`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {dir === 1 ? (
          <path d="M9 18l6-6-6-6" />
        ) : (
          <path d="M15 18l-6-6 6-6" />
        )}
      </svg>
    </button>
  );
}
