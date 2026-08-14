"use client";

// Custom popover Select. NOT browser-default. Click to open, search to filter,
// keyboard nav. Replaces every native <select>.

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface SelectProps {
  value: string | null | undefined;
  onChange: (next: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchable?: boolean;
  emptyLabel?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchable = false,
  emptyLabel = "— None —",
  disabled,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [search, options]);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(filtered.length - 1, h + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(0, h - 1));
      }
      if (e.key === "Enter") {
        const o = filtered[highlight];
        if (o) {
          onChange(o.value);
          setOpen(false);
          setSearch("");
        }
      }
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, filtered, highlight, onChange]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`flex h-9 w-full items-center justify-between gap-2 rounded-input border px-3 text-left text-sm text-ink transition ${
          open
            ? "border-metal"
            : "border-line hover:border-metal/40"
        } bg-bone ${disabled ? "opacity-50" : ""}`}
      >
        <span className="flex flex-1 items-center gap-2 truncate">
          {selected?.icon}
          <span className={selected ? "" : "text-ink-soft"}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown size={14} className="text-ink-soft" />
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-card border border-line bg-bone shadow-card"
        >
          {searchable && (
            <div className="flex items-center gap-2 border-b border-line px-2 py-1.5">
              <Search size={12} className="text-ink-soft" />
              <input
                autoFocus
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlight(0);
                }}
                placeholder="Search…"
                className="w-full bg-transparent text-sm text-ink focus:outline-none"
              />
            </div>
          )}
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-ink-soft">{emptyLabel}</div>
            )}
            {filtered.map((o, i) => {
              const active = value === o.value;
              const hl = highlight === i;
              return (
                <button
                  key={o.value}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink transition ${
                    hl ? "bg-cream" : ""
                  }`}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-metal-text">
                    {active && <Check size={12} />}
                  </span>
                  {o.icon}
                  <span className="flex-1">
                    <span className={active ? "font-medium text-metal-ink" : ""}>
                      {o.label}
                    </span>
                    {o.description && (
                      <span className="ml-2 text-xs text-ink-soft">
                        {o.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
