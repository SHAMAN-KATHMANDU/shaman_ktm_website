"use client";

// Imperative prompt() replacement: const value = await prompt({ title, label }).
// Returns the entered value (string) or null if cancelled.

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "./dialog";

export interface PromptOptions {
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  initial?: string;
  confirmLabel?: string;
  validate?: (value: string) => string | null;
}

interface PendingPrompt extends PromptOptions {
  resolve: (value: string | null) => void;
}

let setPendingExternal: ((p: PendingPrompt | null) => void) | null = null;

export function prompt(opts: PromptOptions): Promise<string | null> {
  return new Promise((resolve) => {
    if (!setPendingExternal) {
      const v = window.prompt(opts.title, opts.initial ?? "");
      resolve(v);
      return;
    }
    setPendingExternal({ ...opts, resolve });
  });
}

export function PromptRoot() {
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setPendingExternal = (p) => {
      setPending(p);
      setValue(p?.initial ?? "");
      setError(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    return () => {
      setPendingExternal = null;
    };
  }, []);

  if (!mounted) return null;

  const close = (v: string | null) => {
    if (pending) pending.resolve(v);
    setPending(null);
  };

  const submit = () => {
    if (!pending) return;
    const trimmed = value.trim();
    if (pending.validate) {
      const err = pending.validate(trimmed);
      if (err) {
        setError(err);
        return;
      }
    }
    close(trimmed);
  };

  return createPortal(
    <Dialog
      open={!!pending}
      onOpenChange={(next) => {
        if (!next) close(null);
      }}
      title={pending?.title}
      description={pending?.description}
      size="sm"
      footer={
        <>
          <button
            onClick={() => close(null)}
            className="rounded border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-base)]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="rounded bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-[var(--color-base)] hover:opacity-90"
          >
            {pending?.confirmLabel ?? "OK"}
          </button>
        </>
      }
    >
      {pending && (
        <div className="space-y-2">
          {pending.label && (
            <label className="block text-sm font-medium">{pending.label}</label>
          )}
          <input
            ref={inputRef}
            value={value}
            placeholder={pending.placeholder}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            className="w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-cream)] focus:border-[var(--color-gold)] focus:outline-none"
          />
          {error && (
            <div className="text-xs text-[var(--color-danger)]">{error}</div>
          )}
        </div>
      )}
    </Dialog>,
    document.body,
  );
}
