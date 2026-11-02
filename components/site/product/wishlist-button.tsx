"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import {
  isWishlisted,
  toggleWishlist,
  type WishlistItem,
} from "@/lib/wishlist";

export function WishlistButton({
  product,
  className = "",
}: {
  product: Omit<WishlistItem, "addedAt">;
  className?: string;
}) {
  const [active, setActive] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setActive(isWishlisted(product.productId));
    setHydrated(true);
  }, [product.productId]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(toggleWishlist(product));
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      // Pre-hydration we keep the button visually neutral so SSR markup
      // doesn't lie about the active state.
      className={`flex h-8 w-8 items-center justify-center border backdrop-blur-sm transition-colors duration-300 ease-lux ${
        hydrated && active
          ? "border-bone bg-bone text-metal-text"
          : "border-bone/50 bg-ink/30 text-bone hover:border-bone hover:bg-bone hover:text-metal-text"
      } ${className}`}
    >
      <Heart
        size={15}
        fill={hydrated && active ? "currentColor" : "transparent"}
      />
    </button>
  );
}
