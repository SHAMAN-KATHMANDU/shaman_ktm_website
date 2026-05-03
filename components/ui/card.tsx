import { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  accent?: string;
  className?: string;
}

export function Card({
  title,
  description,
  actions,
  children,
  accent,
  className = "",
}: CardProps) {
  return (
    <section
      className={`rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] ${className}`}
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4">
          <div>
            {title && (
              <h2 className="font-display text-lg text-[var(--color-cream)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs opacity-60">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
