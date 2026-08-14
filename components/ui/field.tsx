import { ReactNode, forwardRef } from "react";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className = "",
}: {
  label?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            {label}
            {required && <span className="ml-1 text-rakta">*</span>}
          </label>
        </div>
      )}
      {children}
      {error ? (
        <div className="text-xs text-rakta">{error}</div>
      ) : hint ? (
        <div className="text-xs text-ink-soft">{hint}</div>
      ) : null}
    </div>
  );
}

export function TextInput({
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={`h-9 w-full rounded-input border border-line bg-bone px-3 text-sm text-ink outline-none transition focus:border-metal focus:ring-[3px] focus:ring-metal-tint disabled:opacity-50 ${className}`}
    />
  );
}

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      {...rest}
      className={`w-full rounded-input border border-line bg-bone px-3 py-2 text-sm text-ink outline-none transition focus:border-metal focus:ring-[3px] focus:ring-metal-tint disabled:opacity-50 ${className}`}
    />
  );
});
