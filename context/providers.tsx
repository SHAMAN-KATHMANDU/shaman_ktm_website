"use client";

import type { ReactNode } from "react";
import { CartProvider } from "./cart-context";
import { ToastProvider } from "./toast-context";
import { AuthProvider } from "./auth-context";

export function SiteProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>{children}</ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
