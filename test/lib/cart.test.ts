// lib/cart.ts against a stubbed window.localStorage (vitest runs in node).

import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  listCart,
  addToCart,
  setQuantity,
  removeFromCart,
  clearCart,
  cartCount,
  cartSubtotal,
} from "@/lib/cart";
import type { CartItem } from "@/lib/api/types";
import { MAX_QUANTITY } from "@/lib/orders/constants";

function makeLocalStorage(): Storage {
  let store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => void (store = new Map()),
  };
}

const globalAny = globalThis as { window?: unknown };
const originalWindow = globalAny.window;

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: "p1",
    productSlug: "singing-bowl",
    quantity: 1,
    priceAtAdd: 4500,
    nameAtAdd: "Singing Bowl",
    thumbnailAtAdd: "/bowl.jpg",
    ...overrides,
  };
}

beforeEach(() => {
  globalAny.window = { localStorage: makeLocalStorage() };
});

afterAll(() => {
  globalAny.window = originalWindow;
});

describe("lib/cart", () => {
  it("adds and lists items", () => {
    addToCart(item());
    expect(listCart()).toHaveLength(1);
    expect(listCart()[0].nameAtAdd).toBe("Singing Bowl");
  });

  it("merges quantities for the same product+variation line", () => {
    addToCart(item({ quantity: 1 }));
    addToCart(item({ quantity: 2 }));
    expect(listCart()).toHaveLength(1);
    expect(listCart()[0].quantity).toBe(3);
  });

  it("keeps separate lines per variation", () => {
    addToCart(item());
    addToCart(item({ variationId: "v1" }));
    expect(listCart()).toHaveLength(2);
  });

  it("sets quantities and drops lines at zero", () => {
    addToCart(item({ quantity: 2 }));
    setQuantity("p1", undefined, 5);
    expect(listCart()[0].quantity).toBe(5);
    setQuantity("p1", undefined, 0);
    expect(listCart()).toHaveLength(0);
  });

  it("removes and clears", () => {
    addToCart(item());
    addToCart(item({ productId: "p2" }));
    removeFromCart("p1");
    expect(listCart()).toHaveLength(1);
    clearCart();
    expect(listCart()).toHaveLength(0);
  });

  it("clamps quantities at MAX_QUANTITY on add and set", () => {
    addToCart(item({ quantity: MAX_QUANTITY }));
    addToCart(item({ quantity: 5 }));
    expect(listCart()[0].quantity).toBe(MAX_QUANTITY);
    setQuantity("p1", undefined, MAX_QUANTITY + 50);
    expect(listCart()[0].quantity).toBe(MAX_QUANTITY);
  });

  it("computes count and subtotal", () => {
    addToCart(item({ quantity: 2, priceAtAdd: 1000 }));
    addToCart(item({ productId: "p2", quantity: 1, priceAtAdd: 500 }));
    const items = listCart();
    expect(cartCount(items)).toBe(3);
    expect(cartSubtotal(items)).toBe(2500);
  });

  it("is a no-op without a browser window", () => {
    globalAny.window = undefined;
    expect(listCart()).toEqual([]);
    expect(() => addToCart(item())).not.toThrow();
  });
});
