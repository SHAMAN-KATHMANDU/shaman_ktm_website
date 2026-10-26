import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className = "",
  as = "h2",
}: Props) {
  const alignCls = align === "center" ? "text-center" : "text-left";
  const Tag = as;
  return (
    <div className={`${alignCls} ${className}`}>
      {eyebrow && <p className="label-eyebrow mb-3">{eyebrow}</p>}
      <Tag className="display-heading font-display text-3xl md:text-5xl text-ink leading-tight">
        {title}
      </Tag>
      {subtitle && (
        <p
          className={`mt-4 text-ink-soft max-w-2xl ${align === "center" ? "mx-auto" : ""}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
