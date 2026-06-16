"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  /** Emitted when the selected variant's image changes, so a parent can swap
   *  the gallery photo. Receives the variant image URL, or null if none. */
  onVariantImageChange?: (url: string | null) => void;
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

/** True when a string is an image reference (URL or image-file extension). */
function isImageValue(v: string): boolean {
  return /^https?:\/\//i.test(v) || /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(v);
}

/** The first image-valued attribute of a variant, or null. */
function variantImageOf(v: ProductVariation | undefined): string | null {
  if (!v) return null;
  for (const value of Object.values(v.attributes ?? {})) {
    if (value && isImageValue(value)) return value;
  }
  return null;
}

/**
 * Ordered attribute groups (key -> distinct values) derived from variants,
 * excluding image-valued attributes (those drive the gallery, not text chips).
 */
function optionGroups(
  variations: ProductVariation[],
): { key: string; values: string[] }[] {
  const groups = new Map<string, string[]>();
  for (const v of variations) {
    for (const [key, value] of Object.entries(v.attributes ?? {})) {
      if (!value || isImageValue(value)) continue;
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
  onVariantImageChange,
}: Props) {
  const elements = product.elementSlugs ?? [];
  const energy = energyOf(product.tags);
  const isShowroomOnly = product.tags.includes("showroom-only");

  const variations = useMemo(
    () => product.variations ?? [],
    [product.variations],
  );
  const groups = useMemo(() => optionGroups(variations), [variations]);
  // Variants that carry an image but expose no text attribute to choose by.
  const imageOnlyVariants = useMemo(
    () => (groups.length === 0 ? variations.filter((v) => variantImageOf(v)) : []),
    [groups.length, variations],
  );
  // Show a selector when there's a text option to pick or image-only variants.
  const hasOptions = groups.length > 0 || imageOnlyVariants.length > 1;

  const [selectedId, setSelectedId] = useState<string | undefined>(
    variations[0]?.id,
  );
  const selectedVariant =
    variations.find((v) => v.id === selectedId) ?? variations[0];
  const selectedAttrs = selectedVariant?.attributes ?? {};

  const displayPrice = selectedVariant?.price ?? product.price;
  const inStock = selectedVariant ? selectedVariant.stock > 0 : true;

  // Tell the parent (gallery) which photo to show for the selected variant.
  useEffect(() => {
    onVariantImageChange?.(variantImageOf(selectedVariant));
  }, [selectedId, variations, selectedVariant, onVariantImageChange]);

  /** Representative image for an attribute value (for swatch thumbnails). */
  const imageForValue = (key: string, value: string): string | null =>
    variantImageOf(variations.find((v) => v.attributes?.[key] === value));

  const enquireUrl = buildEnquireUrl({
    productName: product.name,
    productUrl:
      typeof window !== "undefined"
        ? window.location.href
        : `https://shamankathmandu.com/products/${product.slug}`,
  });

  const swatchClass = (on: boolean) =>
    `relative block w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
      on
        ? "border-[var(--color-gold)]"
        : "border-[var(--color-border)] hover:border-[var(--color-gold)]/50"
    }`;
  const chipClass = (on: boolean) =>
    `rounded-md border px-3 py-2 text-xs font-medium transition ${
      on
        ? "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-cream)]"
        : "border-[var(--color-border)] text-[var(--color-gold-muted)] hover:border-[var(--color-gold)]/50"
    }`;

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
        <div className="mb-6 space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="label-eyebrow mb-3 capitalize">
                {group.key}
                {selectedAttrs[group.key] && (
                  <span className="ml-2 normal-case text-[var(--color-cream)] opacity-80">
                    {selectedAttrs[group.key]}
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-3">
                {group.values.map((value) => {
                  const on = selectedAttrs[group.key] === value;
                  const img = imageForValue(group.key, value);
                  const select = () => {
                    const next = pickVariant(
                      variations,
                      selectedAttrs,
                      group.key,
                      value,
                    );
                    if (next) setSelectedId(next.id);
                  };
                  return img ? (
                    <button
                      key={value}
                      type="button"
                      onClick={select}
                      aria-pressed={on}
                      title={value}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <span className={swatchClass(on)}>
                        <Image
                          src={img}
                          alt={value}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </span>
                      <span
                        className={`max-w-[72px] truncate text-[10px] ${
                          on
                            ? "text-[var(--color-cream)]"
                            : "text-[var(--color-gold-muted)]"
                        }`}
                      >
                        {value}
                      </span>
                    </button>
                  ) : (
                    <button
                      key={value}
                      type="button"
                      onClick={select}
                      aria-pressed={on}
                      className={chipClass(on)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {groups.length === 0 &&
            imageOnlyVariants.length > 1 &&
            (() => {
              return (
                <div className="flex flex-wrap gap-3">
                  {imageOnlyVariants.map((v, i) => {
                    const on = v.id === selectedVariant?.id;
                    const img = variantImageOf(v)!;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedId(v.id)}
                        aria-pressed={on}
                        title={v.sku || `Option ${i + 1}`}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <span className={swatchClass(on)}>
                          <Image
                            src={img}
                            alt={v.sku || `Option ${i + 1}`}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}

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
