"use client";

import { useMemo, useState } from "react";
import type { ProductDetail, ProductVariation } from "@/lib/api/types";
import { Badge } from "@/components/site/shared/badge";
import { Button } from "@/components/site/shared/button";
import { buildEnquireUrl } from "@/lib/whatsapp";

interface Props {
  product: ProductDetail;
  /** Module flag from CMS — when true, the public price block is rendered. */
  showPrices?: boolean;
  /** CMS-driven label for the WhatsApp CTA. */
  enquireLabel?: string;
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

/** Ordered attribute groups (key -> distinct values) derived from variants. */
function optionGroups(
  variations: ProductVariation[],
): { key: string; values: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const v of variations) {
    for (const [key, value] of Object.entries(v.attributes ?? {})) {
      if (!value) continue;
      const vals = groups.get(key) ?? [];
      if (!vals.includes(value)) vals.push(value);
      groups.set(key, vals);
    }
  }
  return [...groups.entries()].map(([key, values]) => ({ key, values }));
}

/**
 * Pick the variant best matching a newly chosen `key=value`, preferring one that
 * also keeps the most of the currently selected attributes. Always returns a real
 * variant so the UI can never land on an invalid attribute combination.
 */
function pickVariant(
  variations: ProductVariation[],
  current: Record<string, string>,
  key: string,
  value: string,
): ProductVariation | undefined {
  const candidates = variations.filter((v) => v.attributes?.[key] === value);
  if (candidates.length === 0) return undefined;
  let best = candidates[0];
  let bestScore = -1;
  for (const v of candidates) {
    let score = 0;
    for (const [k, val] of Object.entries(current)) {
      if (k !== key && v.attributes?.[k] === val) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

export function ProductInfo({
  product,
  showPrices = false,
  enquireLabel = "Enquire on WhatsApp",
}: Props) {
  const elements = product.elementSlugs ?? [];
  const energy = energyOf(product.tags);
  const isShowroomOnly = product.tags.includes("showroom-only");

  const variations = useMemo(
    () => product.variations ?? [],
    [product.variations],
  );
  const groups = useMemo(() => optionGroups(variations), [variations]);
  // Show a selector only when there's something to choose.
  const hasOptions = variations.length > 1 || groups.length > 0;

  const [selectedId, setSelectedId] = useState<string | undefined>(
    variations[0]?.id,
  );
  const selectedVariant =
    variations.find((v) => v.id === selectedId) ?? variations[0];
  const selectedAttrs = selectedVariant?.attributes ?? {};

  const displayPrice = selectedVariant?.price ?? product.price;
  const inStock = selectedVariant ? selectedVariant.stock > 0 : true;

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
        {product.category?.name && (
          <Badge>{product.category.name}</Badge>
        )}
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

      {showPrices && !product.priceOnEnquiry && (
        <div className="mb-6 flex items-baseline gap-3">
          <span className="font-display text-3xl text-[var(--color-gold)]">
            {product.currency} {displayPrice.toLocaleString()}
          </span>
          {product.compareAtPrice && (
            <span className="text-lg text-[var(--color-gold-muted)] line-through">
              {product.currency} {product.compareAtPrice.toLocaleString()}
            </span>
          )}
        </div>
      )}

      {hasOptions && (
        <div className="mb-6 space-y-4">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="label-eyebrow mb-2 capitalize">{group.key}</p>
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => {
                  const on = selectedAttrs[group.key] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        const next = pickVariant(
                          variations,
                          selectedAttrs,
                          group.key,
                          value,
                        );
                        if (next) setSelectedId(next.id);
                      }}
                      className={`rounded-md border px-3 py-2 text-xs font-medium transition ${
                        on
                          ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-cream)]"
                          : "border-[var(--color-border)] text-[var(--color-gold-muted)] hover:border-[var(--color-gold)]/50"
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3 text-xs text-[var(--color-gold-muted)]">
            <span
              className={
                inStock
                  ? "text-[var(--color-gold)]"
                  : "text-[var(--color-gold-muted)]"
              }
            >
              {inStock ? "In stock" : "Out of stock"}
            </span>
            {selectedVariant?.sku && <span>SKU: {selectedVariant.sku}</span>}
          </div>
        </div>
      )}

      <Button href={enquireUrl} external variant="primary" size="lg" className="w-full mb-3">
        {enquireLabel}
      </Button>
      <p className="text-xs text-[var(--color-gold-muted)] leading-relaxed">
        {showPrices && !product.priceOnEnquiry
          ? "We’ll confirm availability and arrange pickup or shipping."
          : "Pricing on enquiry. We’ll respond with availability, price, and pickup or shipping details."}
      </p>
    </div>
  );
}
