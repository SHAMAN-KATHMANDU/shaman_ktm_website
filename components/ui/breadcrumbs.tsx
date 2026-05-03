import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs opacity-70">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className="flex items-center gap-1">
              {c.href && !last ? (
                <Link
                  href={c.href}
                  className="hover:text-[var(--color-gold)]"
                >
                  {c.label}
                </Link>
              ) : (
                <span className={last ? "text-[var(--color-cream)]" : ""}>
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
