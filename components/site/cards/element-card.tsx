import Link from "next/link";
import type { ElementMeta } from "@/lib/api/types";

export function ElementCard({ element }: { element: ElementMeta }) {
  return (
    <Link
      href={`/nature/${element.slug}`}
      data-element={element.slug}
      className="group relative block aspect-[4/5] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden transition-all hover:-translate-y-1"
      style={{ borderColor: element.accent + "55" }}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <span
          className="text-7xl mb-4 transition-transform group-hover:scale-110"
          style={{ color: element.accent }}
          aria-hidden
        >
          {element.icon}
        </span>
        <h3 className="font-display text-3xl text-[var(--color-cream)] mb-2">
          {element.name}
        </h3>
        <p className="label-eyebrow mb-4" style={{ color: element.accent }}>
          {element.natureSource}
        </p>
        <p className="text-sm text-[var(--color-gold-muted)] max-w-xs leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {element.energyDescription}
        </p>
      </div>
      <span
        className="absolute bottom-4 left-1/2 -translate-x-1/2 label-nav text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: element.accent }}
      >
        Explore {element.name} →
      </span>
    </Link>
  );
}
