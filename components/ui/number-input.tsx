"use client";

import { Minus, Plus } from "lucide-react";

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  disabled,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  const clamp = (n: number) => {
    if (min !== undefined && n < min) return min;
    if (max !== undefined && n > max) return max;
    return n;
  };
  const adj = (delta: number) => {
    const next = clamp((value ?? 0) + delta);
    onChange(next);
  };

  return (
    <div className="inline-flex h-9 w-full items-center overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-base)] focus-within:border-[var(--color-gold)]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => adj(-step)}
        className="flex h-full w-9 items-center justify-center border-r border-[var(--color-border)] opacity-60 transition hover:bg-[var(--color-surface)] hover:opacity-100"
        aria-label="Decrease"
      >
        <Minus size={12} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") {
            onChange(null);
            return;
          }
          const n = Number(v);
          if (!Number.isFinite(n)) return;
          onChange(clamp(n));
        }}
        disabled={disabled}
        className="h-full flex-1 bg-transparent px-3 text-center text-sm text-[var(--color-cream)] focus:outline-none"
        style={{ MozAppearance: "textfield" }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => adj(step)}
        className="flex h-full w-9 items-center justify-center border-l border-[var(--color-border)] opacity-60 transition hover:bg-[var(--color-surface)] hover:opacity-100"
        aria-label="Increase"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
