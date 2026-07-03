"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "./toast-context";
import { AuthProvider } from "./auth-context";
import { CartProvider } from "./cart-context";

export function SiteProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <ToastProvider>{children}</ToastProvider>
      </CartProvider>
    </AuthProvider>
  );
}
