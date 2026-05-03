"use client";

import { KeyboardEvent, useState } from "react";
import { X } from "lucide-react";

export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter…",
  suggestions = [],
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");

  const add = (raw: string) => {
    const parts = raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) {
      if (!next.includes(p)) next.push(p);
    }
    onChange(next);
    setInput("");
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && !input && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const remove = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const remainingSuggestions = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] p-1.5 focus-within:border-[var(--color-gold)]">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-cream)]"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="opacity-50 transition hover:opacity-100"
              aria-label={`Remove ${tag}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={input}
          placeholder={value.length ? "" : placeholder}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[,\n]/.test(text)) {
              e.preventDefault();
              add(input + text);
            }
          }}
          onBlur={() => add(input)}
          className="min-w-[8rem] flex-1 bg-transparent px-1 text-sm focus:outline-none"
        />
      </div>
      {remainingSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {remainingSuggestions.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-dashed border-[var(--color-border)] px-2 py-0.5 text-[10px] opacity-60 transition hover:border-[var(--color-gold)] hover:opacity-100"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
