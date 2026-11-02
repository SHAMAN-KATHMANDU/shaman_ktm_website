// Which photos the storefront gallery shows for the selected variation.
//
// The load-bearing claim is a PREFERENCE one: a variation's real ProductImage
// rows must beat the legacy `attributes` guess, and the legacy guess must
// still work for every variation the backfill has not reached — which today
// is all of them. Getting the preference backwards is invisible in review
// (both branches return a plausible image) and would pin the catalogue to the
// stale attributes copy forever, so it is asserted directly and in both
// directions.
//
// Tested through the pure module rather than the component: the vitest suite
// is node-environment with no .tsx support, so the selection was extracted to
// lib/product-images.ts precisely so it could be asserted here.

import { describe, it, expect } from "vitest";
import type { ProductImageRef, ProductVariation } from "@/lib/api/types";
import {
  isImageValue,
  variantImageOf,
  variationImages,
  variationThumbnail,
  galleryImagesFor,
} from "@/lib/product-images";

const REAL_A: ProductImageRef = { url: "/img/real-a.jpg", alt: "Front" };
const REAL_B: ProductImageRef = { url: "/img/real-b.jpg", alt: null };
const LEGACY_URL = "https://cdn.example.com/legacy.jpg";

function variation(over: Partial<ProductVariation> = {}): ProductVariation {
  return {
    id: "v1",
    sku: "SKU-1",
    price: 1000,
    stock: 3,
    attributes: {},
    ...over,
  };
}

describe("variationImages — source preference", () => {
  it("prefers the variation's REAL images over a legacy attributes URL", () => {
    const v = variation({
      attributes: { colour: "blue", photo: LEGACY_URL },
      images: [REAL_A, REAL_B],
    });
    expect(variationImages(v)).toEqual([REAL_A, REAL_B]);
    // Stated separately: the point is not just "real first" but that the
    // legacy URL is absent entirely. An implementation that merged the two
    // would satisfy a first-element check and still show the photo twice.
    expect(variationImages(v).map((i) => i.url)).not.toContain(LEGACY_URL);
  });

  it("falls back to the legacy attributes URL when there are no real images", () => {
    const v = variation({ attributes: { photo: LEGACY_URL } });
    expect(variationImages(v)).toEqual([{ url: LEGACY_URL, alt: null }]);
  });

  it("treats an EMPTY images array as 'has none', not as 'already handled'", () => {
    // The detail endpoint sends `images: []` for a variation with no photos.
    // Reading that as truthy would kill the legacy fallback for every
    // variation on the live site.
    const v = variation({ attributes: { photo: LEGACY_URL }, images: [] });
    expect(variationImages(v)).toEqual([{ url: LEGACY_URL, alt: null }]);
  });

  it("returns nothing when the variation has neither source", () => {
    expect(variationImages(variation({ attributes: { colour: "blue" } }))).toEqual([]);
  });

  it("returns nothing for no variation at all", () => {
    expect(variationImages(undefined)).toEqual([]);
  });

  it("keeps real images in the order given (the server orders by position)", () => {
    const v = variation({ images: [REAL_B, REAL_A] });
    expect(variationImages(v).map((i) => i.url)).toEqual([
      REAL_B.url,
      REAL_A.url,
    ]);
  });

  it("carries alt text through from real images, and null from legacy", () => {
    expect(variationImages(variation({ images: [REAL_A] }))[0].alt).toBe("Front");
    expect(
      variationImages(variation({ attributes: { photo: LEGACY_URL } }))[0].alt,
    ).toBeNull();
  });
});

describe("variationThumbnail — swatch photo", () => {
  it("uses the first REAL image when the variation has any", () => {
    const v = variation({
      attributes: { photo: LEGACY_URL },
      images: [REAL_A, REAL_B],
    });
    expect(variationThumbnail(v)).toBe(REAL_A.url);
  });

  it("uses the legacy guess when the variation has no real images", () => {
    expect(variationThumbnail(variation({ attributes: { photo: LEGACY_URL } }))).toBe(
      LEGACY_URL,
    );
  });

  it("is null when there is no photo of either kind", () => {
    expect(variationThumbnail(variation())).toBeNull();
    expect(variationThumbnail(undefined)).toBeNull();
  });
});

describe("galleryImagesFor — what the gallery renders", () => {
  const productImages: ProductImageRef[] = [
    { url: "/img/p1.jpg", alt: null },
    { url: "/img/p2.jpg", alt: null },
  ];

  it("shows the selected variation's real images instead of the product gallery", () => {
    const v = variation({ images: [REAL_A, REAL_B] });
    expect(galleryImagesFor(productImages, v)).toEqual([REAL_A, REAL_B]);
  });

  it("REPLACES rather than appends — a photo is never listed twice", () => {
    // Variation photos are ProductImage rows, so they are also in the
    // product's own image list. Appending would duplicate every one of them.
    const shared: ProductImageRef = { url: "/img/p1.jpg", alt: "Blue" };
    const v = variation({ images: [shared] });
    const out = galleryImagesFor(productImages, v);
    expect(out).toHaveLength(1);
    expect(out.filter((i) => i.url === shared.url)).toHaveLength(1);
  });

  it("shows the legacy photo for a variation the backfill has not reached", () => {
    const v = variation({ attributes: { photo: LEGACY_URL } });
    expect(galleryImagesFor(productImages, v)).toEqual([
      { url: LEGACY_URL, alt: null },
    ]);
  });

  it("leaves the product gallery UNCHANGED when the variation has no photos", () => {
    expect(galleryImagesFor(productImages, variation())).toBe(productImages);
  });

  it("leaves the product gallery unchanged when nothing is selected", () => {
    expect(galleryImagesFor(productImages, undefined)).toBe(productImages);
  });
});

describe("legacy reader — kept alive until the backfill", () => {
  // The card that added the real column required these to survive. A later PR
  // retires them; until then, deleting them blanks every variation photo on
  // the live site, so their behaviour is pinned here.
  it("still recognises URLs and image extensions", () => {
    expect(isImageValue("https://cdn.example.com/x.jpg")).toBe(true);
    expect(isImageValue("/media/x.webp")).toBe(true);
    expect(isImageValue("blue")).toBe(false);
  });

  it("still reads the first image-valued attribute", () => {
    expect(
      variantImageOf(variation({ attributes: { size: "L", photo: LEGACY_URL } })),
    ).toBe(LEGACY_URL);
    expect(variantImageOf(variation({ attributes: { size: "L" } }))).toBeNull();
  });

  it("is NOT consulted when real images exist, but is still exported", () => {
    // Both halves matter: the preference above, and the function remaining
    // reachable for the code paths (optionGroups) that still call it.
    const v = variation({ attributes: { photo: LEGACY_URL }, images: [REAL_A] });
    expect(variantImageOf(v)).toBe(LEGACY_URL);
    expect(variationImages(v)).toEqual([REAL_A]);
  });
});
