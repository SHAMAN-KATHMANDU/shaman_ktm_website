import Link from "next/link";
import { ChevronRightIcon } from "@/components/site/icons";

interface Crumb {
  href?: string;
  label: string;
}

interface Props {
  items: Crumb[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: Props) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-2 label-nav text-[10px] text-[var(--color-gold-muted)] ${className}`}
    >
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-2">
            {c.href && !last ? (
              <Link href={c.href} className="hover:text-[var(--color-gold)]">
                {c.label}
              </Link>
            ) : (
              <span className={last ? "text-[var(--color-cream)]" : ""}>
                {c.label}
              </span>
            )}
            {!last && <ChevronRightIcon size={10} className="opacity-60" />}
          </span>
        );
      })}
    </nav>
  );
}
