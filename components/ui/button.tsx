import { ReactNode, ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "outline";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-gold)] text-[var(--color-base)] hover:opacity-90 active:scale-[0.98]",
  secondary:
    "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-cream)] hover:border-[var(--color-gold)] hover:bg-[var(--color-base)]",
  ghost:
    "text-[var(--color-cream)] hover:bg-[var(--color-surface)]",
  danger:
    "border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-[var(--color-cream)]",
  outline:
    "border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[var(--color-base)]",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  lg: "h-11 px-5 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      icon,
      iconRight,
      loading,
      children,
      className = "",
      disabled,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
        {...rest}
      >
        {loading && (
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
        )}
        {!loading && icon}
        {children}
        {!loading && iconRight}
      </button>
    );
  },
);
