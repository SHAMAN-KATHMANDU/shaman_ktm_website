// Local cart persistence — same localStorage approach as lib/wishlist.ts.
// The cart is device-local by design; checkout re-validates every line
// against the database, so nothing here is trusted server-side.

import {
  listKeysWithPrefix,
  readJson,
  writeJson,
  removeKey,
} from "@/lib/storage";
import type { CartItem } from "@/lib/api/types";
import { MAX_QUANTITY } from "@/lib/orders/constants";

const KEY_PREFIX = "sk:cart:v1:";

function keyFor(productId: string, variationId?: string): string {
  return `${KEY_PREFIX}${productId}:${variationId ?? ""}`;
}

export function listCart(): CartItem[] {
  return listKeysWithPrefix(KEY_PREFIX)
    .map((k) => readJson<CartItem>(k))
    .filter((x): x is CartItem => !!x);
}

/**
 * Add `quantity` of a product/variation, merging with any existing line.
 * Quantities clamp to MAX_QUANTITY — the ceiling the order API enforces.
 */
export function addToCart(item: CartItem): void {
  const key = keyFor(item.productId, item.variationId);
  const existing = readJson<CartItem>(key);
  writeJson(key, {
    ...item,
    quantity: Math.min(
      (existing?.quantity ?? 0) + item.quantity,
      MAX_QUANTITY,
    ),
  });
}

export function setQuantity(
  productId: string,
  variationId: string | undefined,
  quantity: number,
): void {
  const key = keyFor(productId, variationId);
  const existing = readJson<CartItem>(key);
  if (!existing) return;
  if (quantity < 1) {
    removeKey(key);
    return;
  }
  writeJson(key, { ...existing, quantity: Math.min(quantity, MAX_QUANTITY) });
}

export function removeFromCart(
  productId: string,
  variationId?: string,
): void {
  removeKey(keyFor(productId, variationId));
}

export function clearCart(): void {
  listKeysWithPrefix(KEY_PREFIX).forEach((k) => removeKey(k));
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.priceAtAdd * i.quantity, 0);
}
