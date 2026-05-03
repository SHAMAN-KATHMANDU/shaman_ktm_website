import { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./breadcrumbs";

export function PageHeader({
  title,
  description,
  actions,
  crumbs,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  crumbs?: Crumb[];
}) {
  return (
    <header className="mb-6 space-y-3">
      {crumbs && <Breadcrumbs crumbs={crumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-[var(--color-cream)]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm opacity-70">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
