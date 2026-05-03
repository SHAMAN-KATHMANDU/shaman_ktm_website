import { ReactNode } from "react";

export function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      {(eyebrow || title || description) && (
        <header className="space-y-1">
          {eyebrow && (
            <div className="label-eyebrow text-[var(--color-gold)]">
              {eyebrow}
            </div>
          )}
          {title && (
            <h3 className="font-display text-base text-[var(--color-cream)]">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-xs opacity-60">{description}</p>
          )}
        </header>
      )}
      {children}
    </div>
  );
}

export function FieldGrid({
  cols = 2,
  children,
}: {
  cols?: 1 | 2 | 3 | 4;
  children: ReactNode;
}) {
  const colsClass = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  }[cols];
  return (
    <div className={`grid grid-cols-1 gap-4 ${colsClass}`}>{children}</div>
  );
}
