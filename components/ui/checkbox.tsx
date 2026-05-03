"use client";

import { Check } from "lucide-react";

interface CheckboxProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
}: CheckboxProps) {
  const box = (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-base)]"
          : "border-[var(--color-border)] bg-[var(--color-base)]"
      }`}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </button>
  );

  if (!label && !description) return box;

  return (
    <label className={`flex items-start gap-2 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      {box}
      <div className="flex-1">
        {label && <div className="text-sm">{label}</div>}
        {description && (
          <div className="text-xs opacity-60">{description}</div>
        )}
      </div>
    </label>
  );
}
