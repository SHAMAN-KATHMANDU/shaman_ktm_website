// Local-only wishlist persistence. Lives in localStorage until a Customer
// model + auth backend exists; same approach the cart-stub uses for orders.

import { listKeysWithPrefix, readJson, writeJson, removeKey } from "@/lib/storage";

const KEY_PREFIX = "sk:wishlist:";

export interface WishlistItem {
  productId: string;
  slug: string;
  name: string;
  thumbnailUrl: string;
  addedAt: string;
}

export function listWishlist(): WishlistItem[] {
  return listKeysWithPrefix(KEY_PREFIX)
    .map((k) => readJson<WishlistItem>(k))
    .filter((x): x is WishlistItem => !!x)
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

export function isWishlisted(productId: string): boolean {
  return readJson<WishlistItem>(KEY_PREFIX + productId) !== null;
}

export function addToWishlist(item: Omit<WishlistItem, "addedAt">): void {
  writeJson(KEY_PREFIX + item.productId, {
    ...item,
    addedAt: new Date().toISOString(),
  });
}

export function removeFromWishlist(productId: string): void {
  removeKey(KEY_PREFIX + productId);
}

export function toggleWishlist(item: Omit<WishlistItem, "addedAt">): boolean {
  if (isWishlisted(item.productId)) {
    removeFromWishlist(item.productId);
    return false;
  }
  addToWishlist(item);
  return true;
}
