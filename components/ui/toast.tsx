"use client";

// Top-right toast stack with success / error / info variants.
// Singleton store + useToast() hook + <Toaster /> portal mount.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastEntry extends ToastInput {
  id: string;
  variant: ToastVariant;
}

type Listener = (toasts: ToastEntry[]) => void;

const store = (() => {
  let toasts: ToastEntry[] = [];
  const listeners = new Set<Listener>();
  const notify = () => listeners.forEach((l) => l(toasts));
  return {
    push(input: ToastInput) {
      const id = Math.random().toString(36).slice(2, 10);
      const entry: ToastEntry = { id, variant: "info", ...input };
      toasts = [...toasts, entry];
      notify();
      const ttl = input.durationMs ?? (input.variant === "error" ? 6000 : 3500);
      if (ttl > 0) setTimeout(() => store.dismiss(id), ttl);
      return id;
    },
    dismiss(id: string) {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      listener(toasts);
      return () => listeners.delete(listener);
    },
  };
})();

export function useToast() {
  return {
    toast: (input: ToastInput) => store.push(input),
    success: (title: string, description?: string) =>
      store.push({ title, description, variant: "success" }),
    error: (title: string, description?: string) =>
      store.push({ title, description, variant: "error" }),
    info: (title: string, description?: string) =>
      store.push({ title, description, variant: "info" }),
  };
}

const ICONS: Record<ToastVariant, React.ComponentType<{ size?: number }>> = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const VARIANT_BORDER: Record<ToastVariant, string> = {
  success: "border-l-[var(--color-success)]",
  error: "border-l-[var(--color-danger)]",
  info: "border-l-[var(--color-gold)]",
};

const VARIANT_ICON_FG: Record<ToastVariant, string> = {
  success: "text-[var(--color-success)]",
  error: "text-[var(--color-danger)]",
  info: "text-[var(--color-gold)]",
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return store.subscribe(setToasts);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-lg border border-[var(--color-border)] border-l-4 ${VARIANT_BORDER[t.variant]} bg-[var(--color-surface)] p-3 shadow-2xl`}
            style={{ animation: "sk-toast-in 200ms ease-out both" }}
          >
            <div className="flex items-start gap-3">
              <Icon size={18} />
              <div className="flex-1">
                <div className={`text-sm font-medium ${VARIANT_ICON_FG[t.variant]}`}>
                  {t.title}
                </div>
                {t.description && (
                  <div className="mt-0.5 text-xs opacity-70">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => store.dismiss(t.id)}
                className="opacity-50 transition hover:opacity-100"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
