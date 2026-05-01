"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Toast {
  id: number;
  message: string;
  variant: "default" | "success" | "error";
}

interface ToastContextValue {
  show: (
    message: string,
    opts?: { variant?: Toast["variant"]; durationMs?: number },
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const show = useCallback(
    (
      message: string,
      opts: { variant?: Toast["variant"]; durationMs?: number } = {},
    ) => {
      idRef.current += 1;
      const id = idRef.current;
      const variant = opts.variant ?? "default";
      const duration = opts.durationMs ?? 3000;
      setToasts((prev) => [...prev, { id, message, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastViewport toasts={toasts} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 right-6 z-[70] flex flex-col gap-2 max-w-sm pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastBubble key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastBubble({ toast }: { toast: Toast }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setExiting(true), 2700);
    return () => window.clearTimeout(t);
  }, []);
  const tone =
    toast.variant === "success"
      ? "border-[var(--color-success)] text-[var(--color-cream)]"
      : toast.variant === "error"
        ? "border-[var(--color-danger)] text-[var(--color-cream)]"
        : "border-[var(--color-gold)] text-[var(--color-cream)]";
  return (
    <div
      className={`pointer-events-auto bg-[var(--color-surface)] border ${tone} px-4 py-3 text-sm shadow-lg`}
      style={{
        animation: exiting
          ? "sk-toast-out 200ms ease forwards"
          : "sk-toast-in 250ms ease",
      }}
    >
      {toast.message}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return { show: () => {} };
  }
  return ctx;
}
