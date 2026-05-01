"use client";

import Link from "next/link";
import type { CartItem } from "@/lib/api/types";
import { QuantityInput } from "@/components/site/shared/quantity-input";
import { useCart } from "@/context/cart-context";
import { formatNpr } from "@/lib/format";
import { CloseIcon } from "@/components/site/icons";

export function CartItemRow({ item }: { item: CartItem }) {
  const cart = useCart();
  return (
    <div className="flex items-start gap-4 py-6 border-b border-[var(--color-border-soft)]">
      <Link
        href={`/products/${item.productSlug}`}
        className="w-20 h-24 flex-shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] overflow-hidden"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.thumbnailAtAdd}
          alt={item.nameAtAdd}
          className="w-full h-full object-cover"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href={`/products/${item.productSlug}`}
          className="font-display text-lg text-[var(--color-cream)] hover:text-[var(--color-gold)] line-clamp-2"
        >
          {item.nameAtAdd}
        </Link>
        <p className="mt-1 text-sm text-[var(--color-gold)]">
          {formatNpr(item.priceAtAdd)}
        </p>
        <div className="mt-3 flex items-center gap-4">
          <QuantityInput
            value={item.quantity}
            onChange={(n) =>
              cart.setQuantity(item.productId, n, item.variationId)
            }
          />
          <button
            type="button"
            onClick={() => cart.remove(item.productId, item.variationId)}
            className="label-nav text-[10px] text-[var(--color-gold-muted)] hover:text-[var(--color-danger)] flex items-center gap-1"
            aria-label={`Remove ${item.nameAtAdd}`}
          >
            <CloseIcon size={12} />
            Remove
          </button>
        </div>
      </div>
      <div className="text-right text-[var(--color-cream)] font-display text-lg">
        {formatNpr(item.priceAtAdd * item.quantity)}
      </div>
    </div>
  );
}
