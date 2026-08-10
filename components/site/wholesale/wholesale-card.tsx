import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/site/shared/badge";
import type { WholesaleProduct } from "@/lib/wholesale";

interface Props {
  product: WholesaleProduct;
  moqLabel: string; // "Minimum {n} pieces"
  moqUnset: string;
  priceOnEnquiry: string;
  enquireLabel: string;
}

// A trade card, not a retail one. Deliberately NOT the shared ProductCard:
// this one shows no price and has no wishlist or add-to-cart, and bending the
// retail card into that shape with four negating props would make it easy for
// a later change to leak a price back onto this page. The MOQ is the number a
// trade buyer needs before enquiring; the price is what the enquiry is for.
export function WholesaleCard({
  product,
  moqLabel,
  moqUnset,
  priceOnEnquiry,
  enquireLabel,
}: Props) {
  const element = product.elementSlugs[0];
  return (
    <Link
      href={`/wholesale?product=${encodeURIComponent(product.slug)}#enquire`}
      data-element={element}
      className="group block bg-[var(--color-surface)] border border-[var(--color-border-soft)] hover:border-[var(--color-gold)] transition-all hover:-translate-y-1"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-surface-2)]">
        {product.thumbnailUrl && (
          <Image
            src={product.thumbnailUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 350px"
            loading="lazy"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {product.elementSlugs.map((el) => (
            <Badge key={el} tone="element" element={el}>
              {el}
            </Badge>
          ))}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg leading-tight text-[var(--color-cream)] mb-2 line-clamp-2">
          {product.name}
        </h3>
        <p className="text-sm text-[var(--color-gold-muted)] mb-2">
          {priceOnEnquiry}
        </p>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[var(--color-gold)] text-sm">
            {enquireLabel}
          </span>
          <span className="label-nav text-[10px] text-[var(--color-gold-muted)] text-right">
            {product.moq
              ? moqLabel.replace("{n}", String(product.moq))
              : moqUnset}
          </span>
        </div>
      </div>
    </Link>
  );
}
