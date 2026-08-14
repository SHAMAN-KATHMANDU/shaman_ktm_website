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
    <div className="rounded-card border border-dashed border-line bg-cream/50 p-10 text-center">
      {icon && (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-metal-tint text-metal-text">
          {icon}
        </div>
      )}
      <h3 className="font-display text-lg text-ink">
        {title}
      </h3>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
