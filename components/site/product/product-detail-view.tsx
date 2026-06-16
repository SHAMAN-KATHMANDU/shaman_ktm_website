"use client";

import { useCallback, useState } from "react";
import type { ProductDetail } from "@/lib/api/types";
import { ProductGallery } from "./product-gallery";
import { ProductInfo } from "./product-info";

interface Props {
  product: ProductDetail;
  images: string[];
  showPrices?: boolean;
  enquireLabel?: string;
}

/**
 * Client wrapper that lifts the active gallery image so selecting a variant in
 * ProductInfo swaps the main photo in ProductGallery.
 */
export function ProductDetailView({
  product,
  images,
  showPrices,
  enquireLabel,
}: Props) {
  const [activeImage, setActiveImage] = useState<string>(images[0]);

  const handleVariantImage = useCallback((url: string | null) => {
    if (url) setActiveImage(url);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16 py-8">
      <ProductGallery
        images={images}
        alt={product.name}
        activeImage={activeImage}
        onSelectImage={setActiveImage}
      />
      <ProductInfo
        product={product}
        showPrices={showPrices}
        enquireLabel={enquireLabel}
        onVariantImageChange={handleVariantImage}
      />
    </div>
  );
}
