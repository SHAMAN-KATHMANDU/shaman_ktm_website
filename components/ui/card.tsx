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
      className={`rounded-card border border-line bg-bone ${className}`}
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4">
          <div>
            {title && (
              <h2 className="font-display text-lg text-ink">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-ink-soft">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
