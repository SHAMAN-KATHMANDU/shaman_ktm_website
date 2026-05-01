"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Cart, CartItem, ProductDetail } from "@/lib/api/types";
import { readJson, writeJson } from "@/lib/storage";

const STORAGE_KEY = "sk:cart:v1";

const EMPTY: Cart = { items: [], updatedAt: new Date(0).toISOString() };

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (
    product: Pick<ProductDetail, "id" | "slug" | "name" | "price" | "thumbnailUrl">,
    quantity?: number,
    variationId?: string,
  ) => void;
  remove: (productId: string, variationId?: string) => void;
  setQuantity: (productId: string, quantity: number, variationId?: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(EMPTY);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    const stored = readJson<Cart>(STORAGE_KEY);
    if (stored && Array.isArray(stored.items)) setCart(stored);
  }, []);

  // Persist on change (skip the empty initial state).
  useEffect(() => {
    if (cart.updatedAt === EMPTY.updatedAt) return;
    writeJson(STORAGE_KEY, cart);
  }, [cart]);

  const add: CartContextValue["add"] = useCallback(
    (product, quantity = 1, variationId) => {
      setCart((prev) => {
        const existing = prev.items.find(
          (i) => i.productId === product.id && i.variationId === variationId,
        );
        const items = existing
          ? prev.items.map((i) =>
              i === existing ? { ...i, quantity: i.quantity + quantity } : i,
            )
          : [
              ...prev.items,
              {
                productId: product.id,
                productSlug: product.slug,
                variationId,
                quantity,
                priceAtAdd: product.price,
                nameAtAdd: product.name,
                thumbnailAtAdd: product.thumbnailUrl,
              },
            ];
        return { items, updatedAt: new Date().toISOString() };
      });
    },
    [],
  );

  const remove: CartContextValue["remove"] = useCallback(
    (productId, variationId) => {
      setCart((prev) => ({
        items: prev.items.filter(
          (i) => !(i.productId === productId && i.variationId === variationId),
        ),
        updatedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  const setQuantity: CartContextValue["setQuantity"] = useCallback(
    (productId, quantity, variationId) => {
      setCart((prev) => ({
        items: prev.items
          .map((i) =>
            i.productId === productId && i.variationId === variationId
              ? { ...i, quantity: Math.max(0, quantity) }
              : i,
          )
          .filter((i) => i.quantity > 0),
        updatedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  const clear = useCallback(() => {
    setCart({ items: [], updatedAt: new Date().toISOString() });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = cart.items.reduce((acc, i) => acc + i.quantity, 0);
    const subtotal = cart.items.reduce(
      (acc, i) => acc + i.priceAtAdd * i.quantity,
      0,
    );
    return { items: cart.items, count, subtotal, add, remove, setQuantity, clear };
  }, [cart, add, remove, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    // SSR fallback: returns an empty, no-op cart so server components can
    // import components that call useCart without crashing during static
    // export. Updates that happen server-side are silently dropped.
    return {
      items: [],
      count: 0,
      subtotal: 0,
      add: () => {},
      remove: () => {},
      setQuantity: () => {},
      clear: () => {},
    };
  }
  return ctx;
}
