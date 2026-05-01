"use client";

import { useState } from "react";

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
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={main}
            alt={alt}
            className="w-full h-full object-cover"
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
              aria-label={`View image ${i + 1}`}
              className={`w-20 h-20 border ${i === active ? "border-[var(--color-gold)] opacity-100" : "border-[var(--color-border)] opacity-60"} hover:opacity-100 transition-opacity`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
