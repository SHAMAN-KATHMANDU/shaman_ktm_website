"use client";

export function MoneyInput({
  value,
  onChange,
  currency = "NPR",
  placeholder = "0",
  disabled,
}: {
  value: number | null;
  onChange: (next: number | null) => void;
  currency?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-9 w-full overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-base)] focus-within:border-[var(--color-gold)]">
      <span className="flex items-center border-r border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-medium uppercase tracking-wider opacity-70">
        {currency}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value === null ? "" : value.toLocaleString("en-US")}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "");
          if (raw === "") {
            onChange(null);
            return;
          }
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(Math.round(n));
        }}
        className="h-full flex-1 bg-transparent px-3 text-right text-sm text-[var(--color-cream)] focus:outline-none disabled:opacity-50"
      />
    </div>
  );
}
