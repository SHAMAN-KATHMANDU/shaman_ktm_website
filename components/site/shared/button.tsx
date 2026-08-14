import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Trinity CTA grammar: gold buys (primary), jade confirms/WhatsApp,
// rakta books/urgent. Max one gold + one rakta CTA per viewport,
// never side by side. Text-bearing gold is metal-deep or darker —
// pure metal never carries text.
type Variant = "primary" | "outline" | "ghost" | "jade" | "rakta";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-metal-deep text-bone hover:bg-metal-ink",
  outline:
    "border border-metal-deep text-metal-text hover:bg-metal-deep hover:text-bone",
  ghost: "border border-line text-ink-soft hover:border-ink hover:text-ink",
  jade: "bg-accent-deep text-bone hover:bg-accent",
  rakta: "bg-rakta text-bone hover:bg-rakta-deep",
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
  "inline-flex items-center justify-center label-nav rounded-input transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";

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
