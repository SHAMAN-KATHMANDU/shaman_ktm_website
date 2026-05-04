"use client";

import { useState } from "react";
import Image from "next/image";

interface Props {
  images: string[];
  alt: string;
}

export function ProductGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0];
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
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-pressed={i === active}
              className={`relative w-20 h-20 border overflow-hidden ${i === active ? "border-[var(--color-gold)] opacity-100" : "border-[var(--color-border)] opacity-60"} hover:opacity-100 transition-opacity`}
            >
              <Image
                src={src}
                alt={`${alt} — view ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
