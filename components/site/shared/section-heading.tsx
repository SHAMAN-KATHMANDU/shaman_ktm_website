import type { ReactNode } from "react";

interface Props {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
  className = "",
}: Props) {
  const alignCls = align === "center" ? "text-center" : "text-left";
  return (
    <div className={`${alignCls} ${className}`}>
      {eyebrow && <p className="label-eyebrow mb-3">{eyebrow}</p>}
      <h2 className="display-heading font-display text-3xl md:text-5xl text-ink leading-tight">
        {title}
      </h2>
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
