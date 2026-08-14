import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs text-ink-soft">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {c.href && !last ? (
                <Link
                  href={c.href}
                  className="hover:text-metal-text"
                >
                  {c.label}
                </Link>
              ) : (
                <span className={last ? "text-ink" : ""}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight size={12} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
