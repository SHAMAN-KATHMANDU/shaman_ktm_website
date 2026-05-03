"use client";

import type { ProductDetail } from "@/lib/api/types";
import { Badge } from "@/components/site/shared/badge";
import { Button } from "@/components/site/shared/button";
import { buildEnquireUrl } from "@/lib/whatsapp";
import { getElementsOf } from "@/data/mock/products";

interface Props {
  product: ProductDetail;
}

const ELEMENT_TAGS = new Set([
  "metal",
  "earth",
  "wood",
  "plant",
  "water",
  "air",
  "dual-element",
]);

const energyOf = (tags: string[]): string | undefined =>
  tags.find(
    (t) =>
      !["new", "member", "showroom-only"].includes(t) &&
      !ELEMENT_TAGS.has(t) &&
      !t.startsWith("product:") &&
      !t.startsWith("element:"),
  );

export function ProductInfo({ product }: Props) {
  const elements = getElementsOf(product);
  const energy = energyOf(product.tags);
  const isShowroomOnly = product.tags.includes("showroom-only");

  const enquireUrl = buildEnquireUrl({
    productName: product.name,
    productUrl:
      typeof window !== "undefined"
        ? window.location.href
        : `https://shamankathmandu.com/products/${product.slug}`,
  });

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {elements.map((el) => (
          <Badge key={el} tone="element" element={el}>
            {el}
          </Badge>
        ))}
        {energy && <Badge>{energy}</Badge>}
        {product.tags.includes("new") && <Badge tone="new">New</Badge>}
      </div>
      <h1 className="font-display text-4xl md:text-5xl text-[var(--color-cream)] leading-tight mb-6">
        {product.name}
      </h1>

      {isShowroomOnly && (
        <div className="border border-[var(--color-gold)] bg-[var(--color-gold)]/5 p-4 mb-6">
          <p className="label-eyebrow mb-2">Showroom-only</p>
          <p className="text-sm text-[var(--color-gold-muted)]">
            This item is available in our showrooms only. WhatsApp the nearest
            showroom to enquire and arrange pickup.
          </p>
        </div>
      )}

      <Button href={enquireUrl} external variant="primary" size="lg" className="w-full mb-3">
        Enquire on WhatsApp
      </Button>
      <p className="text-xs text-[var(--color-gold-muted)] leading-relaxed">
        Pricing on enquiry. We&apos;ll respond with availability, price, and pickup or shipping details.
      </p>
    </div>
  );
}
