import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/50 p-10 text-center">
      {icon && (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-base)] text-[var(--color-gold)]">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg text-[var(--color-cream)]">
        {title}
      </h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm opacity-60">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
