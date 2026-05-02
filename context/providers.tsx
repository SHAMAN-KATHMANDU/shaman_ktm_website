"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "./toast-context";
import { AuthProvider } from "./auth-context";

export function SiteProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
