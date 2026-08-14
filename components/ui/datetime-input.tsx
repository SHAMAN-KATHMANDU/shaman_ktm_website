"use client";

import { TextInput } from "./field";

/**
 * Compact ISO datetime field — accepts `YYYY-MM-DDTHH:mm` (browser local
 * datetime format), persists as UTC ISO string. "Now" and "Clear" buttons.
 */
export function DateTimeInput({
  value,
  onChange,
}: {
  value: string | null; // ISO
  onChange: (next: string | null) => void;
}) {
  const local = value
    ? new Date(value).toISOString().slice(0, 16)
    : "";

  return (
    <div className="flex items-center gap-2">
      <TextInput
        type="datetime-local"
        value={local}
        onChange={(e) => {
          if (!e.target.value) {
            onChange(null);
            return;
          }
          onChange(new Date(e.target.value).toISOString());
        }}
        className="flex-1"
      />
      <button
        type="button"
        onClick={() => onChange(new Date().toISOString())}
        className="rounded-input border border-line px-2 py-1 text-xs text-ink hover:bg-surface"
      >
        Now
      </button>
      <button
        type="button"
        onClick={() => onChange(null)}
        className="rounded-input border border-line px-2 py-1 text-xs text-ink hover:bg-surface"
      >
        Clear
      </button>
    </div>
  );
}
