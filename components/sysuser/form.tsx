"use client";

import React, { useId } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, children }: FieldProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="block">
      <div className="mb-1 text-sm font-medium text-[var(--color-cream)]">
        {label}
      </div>
      <div data-field-id={id}>{children}</div>
      {hint && <div className="mt-1 text-xs opacity-60">{hint}</div>}
    </label>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={`w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-cream)] focus:border-[var(--color-gold)] focus:outline-none ${
        props.className ?? ""
      }`}
    />
  );
}

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea(props, ref) {
  return (
    <textarea
      ref={ref}
      {...props}
      className={`w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-cream)] focus:border-[var(--color-gold)] focus:outline-none ${
        props.className ?? ""
      }`}
    />
  );
});

export function Select(
  props: React.SelectHTMLAttributes<HTMLSelectElement>,
) {
  return (
    <select
      {...props}
      className={`w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-cream)] focus:border-[var(--color-gold)] focus:outline-none ${
        props.className ?? ""
      }`}
    />
  );
}

export function Button({
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles =
    variant === "primary"
      ? "bg-[var(--color-gold)] text-[var(--color-base)] hover:opacity-90"
      : variant === "danger"
        ? "border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-cream)]"
        : "border border-[var(--color-border)] text-[var(--color-cream)] hover:bg-[var(--color-surface)]";
  return (
    <button
      {...props}
      className={`rounded px-4 py-2 text-sm font-medium disabled:opacity-50 ${styles} ${props.className ?? ""}`}
    />
  );
}

export function Checkbox(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...rest } = props;
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" {...rest} className="h-4 w-4 accent-[var(--color-gold)]" />
      {label}
    </label>
  );
}
