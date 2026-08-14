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
      <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
        {label}
      </div>
      <div data-field-id={id}>{children}</div>
      {hint && <div className="mt-1 text-xs text-ink-soft">{hint}</div>}
    </label>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <input
      {...props}
      className={`w-full rounded-input border border-line bg-bone px-3 py-2 text-sm text-ink focus:border-metal focus:outline-none ${
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
      className={`w-full rounded-input border border-line bg-bone px-3 py-2 text-sm text-ink focus:border-metal focus:outline-none ${
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
      className={`w-full rounded-input border border-line bg-bone px-3 py-2 text-sm text-ink focus:border-metal focus:outline-none ${
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
      ? "bg-metal-ink text-bone hover:brightness-95"
      : variant === "danger"
        ? "border border-rakta text-rakta hover:bg-rakta hover:text-bone"
        : "border border-line text-ink hover:bg-surface";
  return (
    <button
      {...props}
      className={`rounded-input px-4 py-2 text-sm font-medium disabled:opacity-50 ${styles} ${props.className ?? ""}`}
    />
  );
}

export function Checkbox(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label: string },
) {
  const { label, ...rest } = props;
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input type="checkbox" {...rest} className="h-4 w-4 accent-metal-deep" />
      {label}
    </label>
  );
}
