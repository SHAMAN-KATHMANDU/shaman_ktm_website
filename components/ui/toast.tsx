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
      return () => {
        listeners.delete(listener);
      };
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

// One toast rail, chart alert recipe: tint ground + deep text per tone.
const VARIANT_BOX: Record<ToastVariant, string> = {
  success: "border-accent/40 bg-accent-tint",
  error: "border-rakta/40 bg-rakta-tint",
  info: "border-info/40 bg-info-tint",
};

const VARIANT_ICON_FG: Record<ToastVariant, string> = {
  success: "text-accent-deep",
  error: "text-rakta-deep",
  info: "text-info-deep",
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return store.subscribe(setToasts);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-3 top-3 z-[1000] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:top-4 sm:w-full sm:max-w-sm"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.variant];
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto rounded-card border ${VARIANT_BOX[t.variant]} p-3 shadow-card`}
            style={{ animation: "sk-toast-in 200ms ease-out both" }}
          >
            <div className={`flex items-start gap-3 ${VARIANT_ICON_FG[t.variant]}`}>
              <Icon size={18} />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {t.title}
                </div>
                {t.description && (
                  <div className="mt-0.5 text-xs text-ink-soft">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => store.dismiss(t.id)}
                className="text-ink-soft transition hover:text-ink"
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
