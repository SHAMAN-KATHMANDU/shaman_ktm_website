"use client";

import { useState } from "react";
import type { ProductDetail } from "@/lib/api/types";
import { Badge } from "@/components/site/shared/badge";
import { Button } from "@/components/site/shared/button";
import { QuantityInput } from "@/components/site/shared/quantity-input";
import { formatNpr } from "@/lib/format";
import { buildEnquireUrl } from "@/lib/whatsapp";
import { useCart } from "@/context/cart-context";
import { useToast } from "@/context/toast-context";
import { getElementOf } from "@/data/mock/products";

interface Props {
  product: ProductDetail;
}

const energyOf = (tags: string[]): string | undefined =>
  tags.find(
    (t) =>
      !["new", "member", "showroom-only"].includes(t) &&
      !t.startsWith("product:") &&
      !t.startsWith("element:"),
  );

export function ProductInfo({ product }: Props) {
  const [qty, setQty] = useState(1);
  const cart = useCart();
  const toast = useToast();

  const element = getElementOf(product);
  const energy = energyOf(product.tags);
  const isShowroomOnly = product.tags.includes("showroom-only");
  const onAdd = () => {
    cart.add(
      {
        id: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
        thumbnailUrl: product.thumbnailUrl,
      },
      qty,
    );
    toast.show(`Added ${qty} × ${product.name} to cart`, {
      variant: "success",
    });
  };

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
        {element && (
          <Badge tone="element" element={element}>
            {element}
          </Badge>
        )}
        {energy && <Badge>{energy}</Badge>}
        {product.tags.includes("new") && <Badge tone="new">New</Badge>}
      </div>
      <h1 className="font-display text-4xl md:text-5xl text-[var(--color-cream)] leading-tight mb-6">
        {product.name}
      </h1>
      <div className="flex items-baseline gap-4 mb-8">
        <span className="text-3xl text-[var(--color-gold)]">
          {formatNpr(product.price)}
        </span>
        {product.compareAtPrice && (
          <span className="text-[var(--color-gold-muted)] line-through text-lg">
            {formatNpr(product.compareAtPrice)}
          </span>
        )}
      </div>

      {isShowroomOnly ? (
        <div className="border border-[var(--color-gold)] bg-[var(--color-gold)]/5 p-4 mb-6">
          <p className="label-eyebrow mb-2">Showroom-only</p>
          <p className="text-sm text-[var(--color-gold-muted)]">
            This item is available in our showrooms only. WhatsApp the nearest
            showroom to enquire and arrange pickup.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <QuantityInput value={qty} onChange={setQty} />
          <Button onClick={onAdd} variant="primary" size="lg" className="flex-1">
            Add to Cart
          </Button>
        </div>
      )}

      <Button href={enquireUrl} external variant="outline" size="lg" className="w-full">
        Enquire on WhatsApp
      </Button>
    </div>
  );
}
