"use client";

// Imperative confirm() replacement: const ok = await confirm({ title, ... }).
// Renders a single shared <ConfirmRoot/> portal that any await call drives.

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { Dialog } from "./dialog";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

let setPendingExternal: ((p: PendingConfirm | null) => void) | null = null;

export function confirm(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!setPendingExternal) {
      // Confirm root not mounted yet — fall back to native.
      resolve(window.confirm(opts.description ? `${opts.title}\n\n${opts.description}` : opts.title));
      return;
    }
    setPendingExternal({ ...opts, resolve });
  });
}

export function ConfirmRoot() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setPendingExternal = setPending;
    return () => {
      setPendingExternal = null;
    };
  }, []);

  if (!mounted) return null;

  const close = (value: boolean) => {
    if (pending) pending.resolve(value);
    setPending(null);
  };

  return createPortal(
    <Dialog
      open={!!pending}
      onOpenChange={(next) => {
        if (!next) close(false);
      }}
      title={pending?.title}
      description={pending?.description}
      size="sm"
      footer={
        <>
          <button
            onClick={() => close(false)}
            className="rounded border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-base)]"
          >
            {pending?.cancelLabel ?? "Cancel"}
          </button>
          <button
            onClick={() => close(true)}
            className={`rounded px-4 py-2 text-sm font-medium ${
              pending?.variant === "danger"
                ? "bg-[var(--color-danger)] text-[var(--color-cream)] hover:opacity-90"
                : "bg-[var(--color-gold)] text-[var(--color-base)] hover:opacity-90"
            }`}
          >
            {pending?.confirmLabel ?? "Confirm"}
          </button>
        </>
      }
    />,
    document.body,
  );
}
