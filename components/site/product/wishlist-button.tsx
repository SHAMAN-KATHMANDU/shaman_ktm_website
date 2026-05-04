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
      className={`p-2 rounded-full bg-black/40 backdrop-blur transition-colors ${
        hydrated && active
          ? "text-[var(--color-gold)]"
          : "text-[var(--color-cream)] hover:text-[var(--color-gold)]"
      } ${className}`}
    >
      <Heart
        size={16}
        fill={hydrated && active ? "currentColor" : "transparent"}
      />
    </button>
  );
}
