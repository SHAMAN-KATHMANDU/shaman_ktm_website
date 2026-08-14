"use client";

// Bilingual field editor (chart §28 bi-field): EN + Nepali paired in one
// bordered group with a surface header strip. Missing Nepali wears the rakta
// "NE missing" badge until filled; complete pairs wear the jade "NE ✓" pill.

const INPUT_CLS =
  "w-full rounded-input border border-line bg-bone px-3 text-sm text-ink outline-none transition focus:border-metal focus:ring-[3px] focus:ring-metal-tint disabled:opacity-50";

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
  const hasNe = Boolean(neValue && neValue.trim());
  return (
    <div className="overflow-hidden rounded-card border border-line">
      <div className="flex items-center justify-between gap-2 bg-surface px-3.5 py-2">
        <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-soft">
          {label}
          {required && <span className="ml-0.5 text-rakta">*</span>}
          <span className="mx-1 font-normal">·</span>EN /{" "}
          <span className="font-devanagari normal-case tracking-normal">
            नेपाली
          </span>
        </span>
        {hasNe ? (
          <span className="inline-flex items-center rounded-full bg-accent-tint px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-deep">
            NE ✓
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-rakta-tint px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rakta-deep">
            NE missing
          </span>
        )}
      </div>
      <div className="grid gap-2.5 p-3.5">
        {multiline ? (
          <textarea
            value={enValue}
            onChange={(e) => onEnChange(e.target.value)}
            placeholder={placeholder}
            className={`${INPUT_CLS} py-2`}
          />
        ) : (
          <input
            type="text"
            value={enValue}
            onChange={(e) => onEnChange(e.target.value)}
            placeholder={placeholder}
            className={`${INPUT_CLS} h-9`}
          />
        )}
        {multiline ? (
          <textarea
            value={neValue ?? ""}
            onChange={(e) => onNeChange(e.target.value || null)}
            placeholder="नेपाली संस्करण…"
            className={`${INPUT_CLS} py-2 font-devanagari`}
          />
        ) : (
          <input
            type="text"
            value={neValue ?? ""}
            onChange={(e) => onNeChange(e.target.value || null)}
            placeholder="नेपाली संस्करण…"
            className={`${INPUT_CLS} h-9 font-devanagari`}
          />
        )}
        {hint && <div className="text-xs text-ink-soft">{hint}</div>}
      </div>
    </div>
  );
}
