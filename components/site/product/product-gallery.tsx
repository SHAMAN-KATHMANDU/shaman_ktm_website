"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImageRef } from "@/lib/api/types";

interface Props {
  /**
   * Photos to show, in order. `alt` is per-image and may be null: product
   * gallery photos have never carried alt text, and neither does a legacy
   * variation photo recovered from `attributes`. Null falls back to `alt`.
   */
  images: ProductImageRef[];
  /** Fallback alt text (the product name) for images with none of their own. */
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
  const main = activeImage ?? images[internal]?.url ?? images[0]?.url;
  // The controlled src can point outside `images` (a variation photo that is
  // not in the current list), so this stays a lookup, not an index read.
  const mainAlt = images.find((i) => i.url === main)?.alt ?? alt;
  const select = (src: string, i: number) => {
    setInternal(i);
    onSelectImage?.(src);
  };
  return (
    <div className="md:sticky md:top-24">
      <div className="relative aspect-[3/4] bg-surface border border-line overflow-hidden">
        {main && (
          <Image
            src={main}
            alt={mainAlt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            className="object-cover"
          />
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex gap-3">
          {images.map((img, i) => {
            const src = img.url;
            const on = src === main;
            return (
              <button
                key={src}
                type="button"
                onClick={() => select(src, i)}
                aria-label={`View image ${i + 1} of ${images.length}`}
                aria-pressed={on}
                className={`relative w-20 h-20 border overflow-hidden ${on ? "border-metal opacity-100" : "border-line opacity-60"} hover:opacity-100 transition-opacity`}
              >
                <Image
                  src={src}
                  alt={img.alt ?? `${alt} — view ${i + 1}`}
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
