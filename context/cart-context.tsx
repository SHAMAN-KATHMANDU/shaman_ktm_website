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
import type { CartItem } from "@/lib/api/types";
import {
  listCart,
  addToCart as addToCartStorage,
  removeFromCart as removeFromCartStorage,
  setQuantity as setQuantityStorage,
  clearCart as clearCartStorage,
  cartCount as getCartCount,
  cartSubtotal as getCartSubtotal,
} from "@/lib/cart";

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  hydrated: boolean;
  add: (item: CartItem) => void;
  setQuantity: (productId: string, variationId: string | undefined, quantity: number) => void;
  remove: (productId: string, variationId: string | undefined) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // On mount, hydrate from localStorage
  useEffect(() => {
    const loaded = listCart();
    setItems(loaded);
    setHydrated(true);
  }, []);

  const add = useCallback((item: CartItem) => {
    addToCartStorage(item);
    const updated = listCart();
    setItems(updated);
  }, []);

  const setQuantity = useCallback(
    (productId: string, variationId: string | undefined, quantity: number) => {
      setQuantityStorage(productId, variationId, quantity);
      const updated = listCart();
      setItems(updated);
    },
    [],
  );

  const remove = useCallback((productId: string, variationId: string | undefined) => {
    removeFromCartStorage(productId, variationId);
    const updated = listCart();
    setItems(updated);
  }, []);

  const clear = useCallback(() => {
    clearCartStorage();
    setItems([]);
  }, []);

  const count = useMemo(() => getCartCount(items), [items]);
  const subtotal = useMemo(() => getCartSubtotal(items), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count,
      subtotal,
      hydrated,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, count, subtotal, hydrated, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return {
      items: [],
      count: 0,
      subtotal: 0,
      hydrated: false,
      add: () => {},
      setQuantity: () => {},
      remove: () => {},
      clear: () => {},
    };
  }
  return ctx;
}
