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
    <div className="inline-flex h-9 w-full items-center overflow-hidden rounded-input border border-line bg-bone focus-within:border-metal">
      <button
        type="button"
        disabled={disabled}
        onClick={() => adj(-step)}
        className="flex h-full w-9 items-center justify-center border-r border-line text-ink-soft transition hover:bg-surface hover:text-ink"
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
        className="h-full flex-1 bg-transparent px-3 text-center text-sm tabular-nums text-ink focus:outline-none"
        style={{ MozAppearance: "textfield" }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => adj(step)}
        className="flex h-full w-9 items-center justify-center border-l border-line text-ink-soft transition hover:bg-surface hover:text-ink"
        aria-label="Increase"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
