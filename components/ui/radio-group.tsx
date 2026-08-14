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
      <div className="inline-flex rounded-input border border-line bg-bone p-1">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`flex items-center gap-1.5 rounded-[7px] px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? "bg-metal-tint text-metal-ink"
                  : "text-ink-soft hover:text-ink"
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
            className={`group flex flex-col items-start gap-1.5 rounded-input border bg-bone p-3 text-left transition ${
              active
                ? "border-metal-deep bg-metal-tint"
                : "border-line hover:border-metal/50"
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
                    ? "border-metal-deep"
                    : "border-line"
                }`}
              >
                {active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-metal-deep" />
                )}
              </span>
            </div>
            {o.description && (
              <span className="text-xs text-ink-soft">{o.description}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
