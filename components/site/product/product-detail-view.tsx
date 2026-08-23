"use client";

import { useCallback, useMemo, useState } from "react";
import type { ProductDetail, ProductImageRef } from "@/lib/api/types";
import { ProductGallery } from "./product-gallery";
import { ProductInfo } from "./product-info";

interface Props {
  product: ProductDetail;
  images: string[];
  showPrices?: boolean;
  cartEnabled?: boolean;
  enquireLabel?: string;
}

/**
 * Client wrapper that lifts the active gallery image so selecting a variant in
 * ProductInfo swaps the photos in ProductGallery.
 *
 * A variation with photos of its own takes over the gallery list; a variation
 * with none leaves the product gallery exactly as it was.
 */
export function ProductDetailView({
  product,
  images,
  showPrices,
  cartEnabled,
  enquireLabel,
}: Props) {
  // The product-level gallery carries no alt text of its own — `ProductDetail`
  // has always exposed its images as bare URLs — so each falls back to the
  // product name in ProductGallery.
  const productImages = useMemo<ProductImageRef[]>(
    () => images.map((url) => ({ url, alt: null })),
    [images],
  );
  const [variantImages, setVariantImages] = useState<ProductImageRef[]>([]);
  const [activeImage, setActiveImage] = useState<string>(images[0]);

  const handleVariantImages = useCallback((next: ProductImageRef[]) => {
    setVariantImages(next);
    // Only a variation that HAS a photo moves the main image. Deselecting does
    // not restore the previous one — matching the single-URL behaviour this
    // replaces, which likewise only ever fired on a non-null image.
    if (next.length > 0) setActiveImage(next[0].url);
  }, []);

  const galleryImages =
    variantImages.length > 0 ? variantImages : productImages;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 py-8">
      <ProductGallery
        images={galleryImages}
        alt={product.name}
        activeImage={activeImage}
        onSelectImage={setActiveImage}
      />
      <ProductInfo
        product={product}
        showPrices={showPrices}
        cartEnabled={cartEnabled}
        enquireLabel={enquireLabel}
        onVariantImagesChange={handleVariantImages}
      />
    </div>
  );
}
