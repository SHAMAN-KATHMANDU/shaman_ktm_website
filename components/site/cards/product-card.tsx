import Link from "next/link";
import type { ProductSummary } from "@/lib/api/types";
import { Badge } from "@/components/site/shared/badge";
import { getElementOf } from "@/data/mock/products";

interface Props {
  product: ProductSummary;
  className?: string;
}

const energyOf = (tags: string[] | undefined): string | undefined => {
  if (!tags) return undefined;
  // First tag that isn't "new"/"member"/"showroom-only"/"product:*"/"element:*".
  return tags.find(
    (t) =>
      !["new", "member", "showroom-only"].includes(t) &&
      !t.startsWith("product:") &&
      !t.startsWith("element:"),
  );
};

export function ProductCard({ product, className = "" }: Props) {
  const element = getElementOf(product);
  const energy = energyOf(product.tags);
  const isNew = product.tags?.includes("new");
  return (
    <Link
      href={`/products/${product.slug}`}
      data-element={element}
      className={`group block bg-[var(--color-surface)] border border-[var(--color-border-soft)] hover:border-[var(--color-gold)] transition-all hover:-translate-y-1 ${className}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-surface-2)]">
        {/* Picsum images are static; using <img> avoids the optimizer hop. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.thumbnailUrl}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {element && (
            <Badge tone="element" element={element}>
              {element}
            </Badge>
          )}
          {isNew && <Badge tone="new">New</Badge>}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg leading-tight text-[var(--color-cream)] mb-2 line-clamp-2">
          {product.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-gold)] text-sm">
            Enquire on WhatsApp
          </span>
          {energy && (
            <span className="label-nav text-[10px] text-[var(--color-gold-muted)]">
              {energy}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
