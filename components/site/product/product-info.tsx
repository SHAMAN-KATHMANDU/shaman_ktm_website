"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type {
  Dimensions,
  ProductDetail,
  ProductImageRef,
  ProductVariation,
} from "@/lib/api/types";
import {
  isImageValue,
  variationImages,
  variationThumbnail,
} from "@/lib/product-images";
import { Badge } from "@/components/site/shared/badge";
import { Button } from "@/components/site/shared/button";
import { buildEnquireUrl } from "@/lib/whatsapp";
import { splitLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { useCart } from "@/context/cart-context";
import { useToast } from "@/context/toast-context";
import { trackViewContent, trackAddToCart } from "@/lib/pixel";
import { catalogItemId } from "@/lib/catalog-id";

interface Props {
  product: ProductDetail;
  /** Module flag from CMS — when true, the public price block is rendered. */
  showPrices?: boolean;
  /** Module flag from CMS — when true (and prices show), add-to-cart renders. */
  cartEnabled?: boolean;
  /** CMS-driven label for the WhatsApp CTA. */
  enquireLabel?: string;
  /** Emitted when the selected variant's photos change, so a parent can swap
   *  the gallery. Receives the variant's images (real rows, else the single
   *  legacy attributes photo), or an empty list when it has none. */
  onVariantImagesChange?: (images: ProductImageRef[]) => void;
}

/** At or below this many units left, show a "Only N left" low-stock warning. */
const LOW_STOCK_THRESHOLD = 5;

/** Label/value rows for the populated dimension measurements. */
function dimensionRows(
  d: Dimensions,
  labels: {
    dimLength: string;
    dimWidth: string;
    dimHeight: string;
    dimDiameter: string;
    dimWeight: string;
  },
): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, val: number | null | undefined, unit: string) => {
    if (val != null) rows.push({ label, value: `${val} ${unit}` });
  };
  push(labels.dimLength, d.length, d.unit);
  push(labels.dimWidth, d.width, d.unit);
  push(labels.dimHeight, d.height, d.unit);
  push(labels.dimDiameter, d.diameter, d.unit);
  push(labels.dimWeight, d.weight, d.weightUnit);
  return rows;
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
  cartEnabled = false,
  enquireLabel,
  onVariantImagesChange,
}: Props) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const { add: addToCart } = useCart();
  const toast = useToast();
  const elements = product.elementSlugs ?? [];
  const energy = energyOf(product.tags);
  const isShowroomOnly = product.tags.includes("showroom-only");
  const defaultEnquireLabel = t.product.enquireOnWhatsapp;
  const [addingToCart, setAddingToCart] = useState(false);

  const variations = useMemo(
    () => product.variations ?? [],
    [product.variations],
  );
  const groups = useMemo(() => optionGroups(variations), [variations]);
  // Variants that carry an image but expose no text attribute to choose by.
  // Real images count here too, not just the legacy attributes photo — a
  // variation whose only photo is a real row would otherwise vanish from the
  // selector entirely, leaving the product with no way to switch variant.
  const imageOnlyVariants = useMemo(
    () =>
      groups.length === 0
        ? variations.filter((v) => variationThumbnail(v))
        : [],
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

  // The headline price follows the product's base price — the field edited in
  // the admin. Variant rows can carry their own price in the data model, but the
  // public price reflects the base so price edits always show through.
  const displayPrice = product.price;

  // Reconciled availability: variant products use the selected variant's stock;
  // variation-less products fall back to the product-level stockQuantity. null
  // means "untracked" → always available (no count shown).
  const availableStock: number | null =
    variations.length > 0
      ? (selectedVariant?.stock ?? 0)
      : (product.stockQuantity ?? null);
  const inStock = availableStock === null || availableStock > 0;
  const stockLabel =
    availableStock === null
      ? t.common.inStock
      : availableStock === 0
        ? t.common.outOfStock
        : availableStock <= LOW_STOCK_THRESHOLD
          ? t.common.onlyNLeft.replace("{n}", String(availableStock))
          : t.common.inStockCount.replace("{n}", String(availableStock));

  const dimRows = product.dimensions
    ? dimensionRows(product.dimensions, {
        dimLength: t.product.dimLength,
        dimWidth: t.product.dimWidth,
        dimHeight: t.product.dimHeight,
        dimDiameter: t.product.dimDiameter,
        dimWeight: t.product.dimWeight,
      })
    : [];
  const dimNote = product.dimensions?.note?.trim() || "";
  const showDimensions = dimRows.length > 0 || dimNote !== "";

  // Tell the parent (gallery) which photos to show for the selected variant.
  useEffect(() => {
    onVariantImagesChange?.(variationImages(selectedVariant));
  }, [selectedId, variations, selectedVariant, onVariantImagesChange]);

  // Meta Pixel ViewContent — once per product. Uses the representative
  // (first) variation's catalog id so it matches a feed item; AddToCart below
  // uses the actually-selected variation.
  useEffect(() => {
    trackViewContent({
      contentId: catalogItemId(product.slug, variations[0]?.id),
      name: product.name,
      price: product.price,
      currency: product.currency,
      priceOnEnquiry: product.priceOnEnquiry,
    });
    // Fire once per product; variant switches don't refire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.slug]);

  /** Representative image for an attribute value (for swatch thumbnails). */
  const imageForValue = (key: string, value: string): string | null =>
    variationThumbnail(variations.find((v) => v.attributes?.[key] === value));

  const enquireUrl = buildEnquireUrl({
    productName: product.name,
    productUrl:
      typeof window !== "undefined"
        ? window.location.href
        : `https://shamankathmandu.com/products/${product.slug}`,
  });

  const handleAddToCart = () => {
    setAddingToCart(true);
    try {
      // Snapshot the price checkout will actually charge: the selected
      // variation's own price when one exists, else the base price.
      addToCart({
        nameAtAdd: product.name,
        priceAtAdd: selectedVariant?.price ?? product.price,
        productId: product.id,
        productSlug: product.slug,
        quantity: 1,
        thumbnailAtAdd: product.images?.[0] || product.thumbnailUrl || "",
        variationId: selectedVariant?.id,
        variationSku: selectedVariant?.sku,
      });
      trackAddToCart({
        contentId: catalogItemId(product.slug, selectedVariant?.id),
        name: product.name,
        price: selectedVariant?.price ?? product.price,
        quantity: 1,
        currency: product.currency,
      });
      toast.show(t.cart.addedToCart, { variant: "success" });
    } catch {
      toast.show(t.cart.addFailed, { variant: "error" });
    }
    setAddingToCart(false);
  };

  const swatchClass = (on: boolean) =>
    `relative block w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
      on
        ? "border-metal"
        : "border-line hover:border-metal/50"
    }`;
  const chipClass = (on: boolean) =>
    `rounded-md border px-3 py-2 text-xs font-medium transition ${
      on
        ? "border-metal bg-metal-tint text-metal-ink"
        : "border-line text-ink-soft hover:border-metal/50"
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
        {product.tags.includes("new") && <Badge tone="new">{t.common.new}</Badge>}
      </div>
      <h1 className="font-display text-4xl md:text-5xl text-ink leading-tight mb-6">
        {product.name}
      </h1>

      {isShowroomOnly && (
        <div className="border border-metal bg-metal-tint p-4 mb-6">
          <p className="label-eyebrow mb-2">{t.common.showroomOnly}</p>
          <p className="text-sm text-ink-soft">
            {t.product.showroomOnlyNote}
          </p>
        </div>
      )}

      {showPrices && !product.priceOnEnquiry && (
        <div className="mb-6 flex items-baseline gap-3">
          <span className="font-display text-3xl text-metal-text tabular-nums">
            {product.currency} {displayPrice.toLocaleString()}
          </span>
          {product.compareAtPrice && (
            <span className="text-lg text-ink-soft line-through tabular-nums">
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
                  <span className="ml-2 normal-case text-ink opacity-80">
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
                            ? "text-ink"
                            : "text-ink-soft"
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
                    const img = variationThumbnail(v)!;
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
        </div>
      )}

      {/* Availability — always shown, for both variant and single-item
          products. Count + low-stock warning; untracked products show a plain
          "In stock". */}
      <div className="mb-6 flex items-center gap-3 text-xs text-ink-soft">
        <span
          className={
            availableStock === null || (availableStock > LOW_STOCK_THRESHOLD)
              ? "text-accent-deep"
              : "text-rakta"
          }
        >
          {stockLabel}
        </span>
        {selectedVariant?.sku && (
          <span>
            {t.common.sku}: {selectedVariant.sku}
          </span>
        )}
      </div>

      {showDimensions && (
        <div className="mb-6 bg-surface border border-line rounded-card p-4">
          <p className="label-eyebrow mb-3">{t.product.dimensionsHeading}</p>
          {dimRows.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
              {dimRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3">
                  <dt className="text-ink-soft">{row.label}</dt>
                  <dd className="text-ink tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {dimNote && (
            <p className="mt-2 text-xs text-ink-soft leading-relaxed">
              {dimNote}
            </p>
          )}
        </div>
      )}

      {cartEnabled && showPrices && !product.priceOnEnquiry && (
        <Button
          onClick={handleAddToCart}
          variant="primary"
          size="lg"
          className="w-full mb-3"
          disabled={addingToCart || !inStock}
        >
          {addingToCart ? t.common.loading : t.product.addToCart}
        </Button>
      )}
      {/* WhatsApp always speaks jade — gold stays reserved for add-to-cart. */}
      <Button href={enquireUrl} external variant="jade" size="lg" className="w-full mb-3">
        {enquireLabel ?? defaultEnquireLabel}
      </Button>
      <p className="text-xs text-ink-soft leading-relaxed">
        {showPrices && !product.priceOnEnquiry
          ? "We’ll confirm availability and arrange pickup or shipping."
          : "Pricing on enquiry. We’ll respond with availability, price, and pickup or shipping details."}
      </p>
    </div>
  );
}
