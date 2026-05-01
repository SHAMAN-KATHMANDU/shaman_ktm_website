import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "bg-[var(--color-gold)] text-[var(--color-base)] hover:bg-[var(--color-gold-soft)]",
  outline:
    "border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[var(--color-base)]",
  ghost:
    "border border-[var(--color-border)] text-[var(--color-gold-muted)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold)]",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "px-4 py-2 text-[10px]",
  md: "px-6 py-3 text-[11px]",
  lg: "px-8 py-4 text-xs",
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
}

interface ButtonProps
  extends BaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> {
  href?: never;
}

interface LinkProps extends BaseProps {
  href: string;
  external?: boolean;
}

type Props = ButtonProps | LinkProps;

const baseClass =
  "inline-flex items-center justify-center label-nav transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

export function Button(props: Props) {
  const { variant = "primary", size = "md", className = "", children } = props;
  const cls = `${baseClass} ${VARIANT_CLASS[variant]} ${SIZE_CLASS[size]} ${className}`;

  if ("href" in props && props.href) {
    if (props.external) {
      return (
        <a href={props.href} target="_blank" rel="noopener noreferrer" className={cls}>
          {children}
        </a>
      );
    }
    return (
      <Link href={props.href} className={cls}>
        {children}
      </Link>
    );
  }
  const { href: _ignore, ...rest } = props as ButtonProps & { href?: never };
  void _ignore;
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
