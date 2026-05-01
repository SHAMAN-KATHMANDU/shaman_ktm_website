"use client";

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  className?: string;
}

export function QuantityInput({
  value,
  min = 1,
  max = 99,
  onChange,
  className = "",
}: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div
      className={`inline-flex items-center border border-[var(--color-border)] ${className}`}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={dec}
        disabled={value <= min}
        className="w-10 h-10 flex items-center justify-center text-[var(--color-gold-muted)] hover:text-[var(--color-gold)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        −
      </button>
      <span className="w-10 text-center text-[var(--color-cream)]" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={inc}
        disabled={value >= max}
        className="w-10 h-10 flex items-center justify-center text-[var(--color-gold-muted)] hover:text-[var(--color-gold)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  );
}
