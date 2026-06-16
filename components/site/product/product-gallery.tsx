"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  alt: string;
  /** Controlled active image src. When provided, it drives the main photo. */
  activeImage?: string;
  /** Called when a thumbnail is clicked, so a parent can sync shared state. */
  onSelectImage?: (src: string) => void;
}

export function ProductGallery({
  images,
  alt,
  activeImage,
  onSelectImage,
}: Props) {
  const [internal, setInternal] = useState(0);
  // Prefer the controlled src; fall back to internal index for standalone use.
  const main = activeImage ?? images[internal] ?? images[0];
  const select = (src: string, i: number) => {
    setInternal(i);
    onSelectImage?.(src);
  };
  return (
    <div className="md:sticky md:top-24">
      <div className="relative aspect-[3/4] bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden">
        {main && (
          <Image
            src={main}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            className="object-cover"
          />
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex gap-3">
          {images.map((src, i) => {
            const on = src === main;
            return (
              <button
                key={src}
                type="button"
                onClick={() => select(src, i)}
                aria-label={`View image ${i + 1} of ${images.length}`}
                aria-pressed={on}
                className={`relative w-20 h-20 border overflow-hidden ${on ? "border-[var(--color-gold)] opacity-100" : "border-[var(--color-border)] opacity-60"} hover:opacity-100 transition-opacity`}
              >
                <Image
                  src={src}
                  alt={`${alt} — view ${i + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
