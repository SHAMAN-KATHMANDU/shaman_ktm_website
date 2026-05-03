"use client";

import { ReactNode } from "react";

export interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  accent?: string;
}

interface RadioGroupProps<T extends string> {
  value: T | undefined;
  onChange: (next: T) => void;
  options: RadioOption<T>[];
  variant?: "segmented" | "card";
  cols?: 1 | 2 | 3 | 4 | 6;
}

export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  variant = "segmented",
  cols = 3,
}: RadioGroupProps<T>) {
  if (variant === "segmented") {
    return (
      <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] p-1">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-[var(--color-gold)] text-[var(--color-base)]"
                  : "text-[var(--color-cream)] opacity-60 hover:opacity-100"
              }`}
            >
              {o.icon}
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  // card variant
  const colsClass = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    6: "md:grid-cols-6",
  }[cols];

  return (
    <div className={`grid grid-cols-2 gap-2 ${colsClass}`}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`group flex flex-col items-start gap-1.5 rounded-lg border bg-[var(--color-base)] p-3 text-left transition ${
              active
                ? "border-[var(--color-gold)] bg-[var(--color-gold)]/5"
                : "border-[var(--color-border)] hover:border-[var(--color-gold)]/50"
            }`}
            style={
              active && o.accent
                ? { boxShadow: `inset 4px 0 0 0 ${o.accent}` }
                : undefined
            }
          >
            <div className="flex w-full items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                {o.icon || (o.accent && (
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: o.accent }}
                  />
                ))}
                {o.label}
              </span>
              <span
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${
                  active
                    ? "border-[var(--color-gold)]"
                    : "border-[var(--color-border)]"
                }`}
              >
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-gold)]" />
                )}
              </span>
            </div>
            {o.description && (
              <span className="text-xs opacity-60">{o.description}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
