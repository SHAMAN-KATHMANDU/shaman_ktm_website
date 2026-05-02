import Link from "next/link";
import type { BundleSummary } from "@/lib/api/types";

export function BundleCard({ bundle }: { bundle: BundleSummary }) {
  const thumb = bundle.items[0]?.thumbnailUrl;
  return (
    <Link
      href={`/bundles/${bundle.slug}`}
      className="group block bg-[var(--color-surface)] border border-[var(--color-border-soft)] hover:border-[var(--color-gold)] transition-all hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-2)]">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={bundle.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute top-3 left-3">
          <span className="label-nav text-[10px] px-2.5 py-1 border border-[var(--color-gold)] text-[var(--color-gold)] bg-black/50">
            Bundle · {bundle.items.length} pieces
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display text-2xl text-[var(--color-cream)] leading-tight mb-3">
          {bundle.title}
        </h3>
        <span className="text-[var(--color-gold)]">Enquire on WhatsApp</span>
      </div>
    </Link>
  );
}
