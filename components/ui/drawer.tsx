"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "lg",
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === "undefined") return null;

  const w =
    width === "md"
      ? "max-w-md"
      : width === "xl"
        ? "max-w-2xl"
        : "max-w-lg";

  return createPortal(
    <div className="fixed inset-0 z-[800]" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        style={{ animation: "sk-fade-in 200ms ease-out both" }}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full ${w} flex-col border-l border-line bg-bone shadow-card`}
        style={{ animation: "sk-drawer-in 240ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
      >
        {(title || description) && (
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              {title && (
                <h2 className="font-display text-xl text-ink">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded p-1 text-ink-soft hover:bg-cream hover:text-ink"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && (
          <footer className="border-t border-line bg-surface p-4">
            {footer}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}
