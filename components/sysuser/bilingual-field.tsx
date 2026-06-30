"use client";

// Bilingual field editor: renders an English input + a Nepali input beneath it.
// Nepali input is always optional. Input styling matches the admin UI exactly.

import { Field } from "@/components/ui/field";

export function BilingualField({
  label,
  enValue,
  neValue,
  onEnChange,
  onNeChange,
  multiline = false,
  required = false,
  placeholder,
  hint,
}: {
  label: string;
  enValue: string;
  neValue: string | null | undefined;
  onEnChange: (value: string) => void;
  onNeChange: (value: string | null) => void;
  multiline?: boolean;
  required?: boolean;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-3">
      <Field label={label} required={required} hint={hint}>
        {multiline ? (
          <textarea
            value={enValue}
            onChange={(e) => onEnChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none transition focus:border-[var(--color-gold)] disabled:opacity-50"
          />
        ) : (
          <input
            type="text"
            value={enValue}
            onChange={(e) => onEnChange(e.target.value)}
            placeholder={placeholder}
            className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-sm text-[var(--color-cream)] outline-none transition focus:border-[var(--color-gold)] disabled:opacity-50"
          />
        )}
      </Field>

      <Field label="नेपाली (Nepali)">
        {multiline ? (
          <textarea
            value={neValue ?? ""}
            onChange={(e) => onNeChange(e.target.value || null)}
            placeholder={placeholder}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none transition focus:border-[var(--color-gold)] disabled:opacity-50"
          />
        ) : (
          <input
            type="text"
            value={neValue ?? ""}
            onChange={(e) => onNeChange(e.target.value || null)}
            placeholder={placeholder}
            className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-sm text-[var(--color-cream)] outline-none transition focus:border-[var(--color-gold)] disabled:opacity-50"
          />
        )}
      </Field>
    </div>
  );
}
