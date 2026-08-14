"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface DialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES: Record<NonNullable<DialogProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
}: DialogProps) {
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

  return createPortal(
    <div
      className="fixed inset-0 z-[900] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={`relative w-full ${SIZE_CLASSES[size]} rounded-card border border-line bg-bone shadow-card`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="border-b border-line p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && (
                  <h3 className="font-display text-xl text-ink">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="mt-1 text-sm text-ink-soft">{description}</p>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded p-1 text-ink-soft transition hover:bg-cream hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
        {children && <div className="p-5">{children}</div>}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface p-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
