import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Trinity CTA grammar: gold buys (primary), jade confirms/WhatsApp,
// rakta books/urgent. Max one gold + one rakta CTA per viewport,
// never side by side. Text-bearing gold is metal-deep or darker —
// pure metal never carries text.
type Variant = "primary" | "outline" | "ghost" | "jade" | "rakta" | "inverse";
type Size = "sm" | "md" | "lg";

// Each variant names its hover "wipe" colour (before:bg-*) — a fill that
// slides in from the left on hover, square-edged like everything else.
const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-metal-deep text-bone before:bg-metal-ink",
  outline:
    "border border-metal-deep text-metal-text before:bg-metal-deep hover:text-bone",
  ghost: "border border-line text-ink-soft before:bg-cream hover:border-ink hover:text-ink",
  jade: "bg-accent-deep text-bone before:bg-accent",
  rakta: "bg-rakta text-bone before:bg-rakta-deep",
  // For ink/photo grounds only — bone-on-ink is the sanctioned dark pairing.
  inverse: "border border-bone/60 text-bone before:bg-bone hover:text-ink",
};

const SIZE_CLASS: Record<Size, string> = {
  sm: "min-h-10 px-5 text-[10px]",
  md: "min-h-12 px-7 text-[11px]",
  lg: "min-h-14 px-9 text-xs",
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
  "relative isolate overflow-hidden inline-flex items-center justify-center gap-2 label-nav transition-[color,border-color] duration-500 ease-lux disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:transition-transform before:duration-500 before:ease-lux hover:before:scale-x-100 disabled:before:hidden";

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
  // Strip every prop we consume before spreading — leaving className in
  // `rest` would overwrite `cls` and render the button unstyled.
  const {
    href: _href,
    variant: _variant,
    size: _size,
    className: _className,
    children: _children,
    ...rest
  } = props as ButtonProps & { href?: never };
  void _href;
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
