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
          <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-cream)] opacity-80">
            {label}
            {required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
          </label>
        </div>
      )}
      {children}
      {error ? (
        <div className="text-xs text-[var(--color-danger)]">{error}</div>
      ) : hint ? (
        <div className="text-xs opacity-50">{hint}</div>
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
      className={`h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 text-sm text-[var(--color-cream)] outline-none transition focus:border-[var(--color-gold)] disabled:opacity-50 ${className}`}
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
      className={`w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none transition focus:border-[var(--color-gold)] disabled:opacity-50 ${className}`}
    />
  );
});
