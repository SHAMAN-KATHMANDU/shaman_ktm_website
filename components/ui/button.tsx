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
  // Admin Save/primary presses one step darker than the storefront CTA:
  // metal-ink (AA 6.6), not metal-deep.
  primary:
    "bg-metal-ink text-bone hover:brightness-95 active:scale-[0.98]",
  secondary:
    "border border-line bg-bone text-ink hover:border-ink hover:bg-surface",
  ghost:
    "text-ink hover:bg-surface",
  danger:
    "border border-rakta text-rakta hover:bg-rakta hover:text-bone",
  outline:
    "border border-metal-deep text-metal-text hover:bg-metal-deep hover:text-bone",
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
        className={`inline-flex items-center justify-center gap-2 rounded-input font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT[variant]} ${SIZE[size]} ${className}`}
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
