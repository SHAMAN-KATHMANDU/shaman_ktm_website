/**
 * Which photos a product variation shows, and where they come from.
 *
 * Two sources, in order of trust:
 *   1. REAL rows — `ProductImage` records assigned to the variation
 *      (`ProductImage.variationId`). Plural, ordered, with alt text.
 *   2. LEGACY guess — before that column existed, a variation photo was
 *      smuggled into the variation's `attributes` JSON and recovered by
 *      looking for a value that resembles an image URL. Exactly one photo,
 *      never any alt text, and it misfires on any attribute whose value
 *      happens to end in `.svg`.
 *
 * The legacy reader stays until the data is backfilled: every variation photo
 * on the live site today is still stored that way, so deleting it here would
 * blank the gallery for the entire catalogue. Retiring it is a separate change
 * that must follow the backfill, not accompany it.
 *
 * These are pure functions living outside the component so they can be tested
 * in the node-environment vitest suite, which has no .tsx support.
 */
import type { ProductImageRef, ProductVariation } from "@/lib/api/types";

/** True when a string is an image reference (URL or image-file extension). */
export function isImageValue(v: string): boolean {
  return /^https?:\/\//i.test(v) || /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(v);
}

/** The first image-valued attribute of a variant, or null. (Legacy source.) */
export function variantImageOf(v: ProductVariation | undefined): string | null {
  if (!v) return null;
  for (const value of Object.values(v.attributes ?? {})) {
    if (value && isImageValue(value)) return value;
  }
  return null;
}

/**
 * Every photo to show for a variation: its real images when it has any, else
 * the single legacy guess, else nothing.
 *
 * Real images win WHOLESALE rather than being merged with the legacy guess.
 * Once a variation has been given real photos, the attributes URL is the stale
 * copy of one of them — merging would show the same picture twice, and the
 * duplicate would be the one with no alt text.
 */
export function variationImages(
  v: ProductVariation | undefined,
): ProductImageRef[] {
  if (!v) return [];
  const real = v.images ?? [];
  if (real.length > 0) return real;
  const legacy = variantImageOf(v);
  return legacy ? [{ url: legacy, alt: null }] : [];
}

/** Representative photo URL for a variation (swatch thumbnails), or null. */
export function variationThumbnail(
  v: ProductVariation | undefined,
): string | null {
  return variationImages(v)[0]?.url ?? null;
}

/**
 * The gallery's image list for the current selection.
 *
 * A variation with photos REPLACES the product gallery rather than appending
 * to it: its images are already among the product's images (they are the same
 * `ProductImage` rows), so appending would list each one twice. A variation
 * with no photos of either kind leaves the gallery exactly as it was.
 */
export function galleryImagesFor(
  productImages: ProductImageRef[],
  selected: ProductVariation | undefined,
): ProductImageRef[] {
  const own = variationImages(selected);
  return own.length > 0 ? own : productImages;
}
