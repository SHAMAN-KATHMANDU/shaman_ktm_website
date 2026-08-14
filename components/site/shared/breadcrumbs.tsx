import { LocaleLink } from "@/components/site/locale-link";
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
      className={`flex items-center gap-2 label-nav text-[10px] text-ink-soft ${className}`}
    >
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-2">
            {c.href && !last ? (
              <LocaleLink href={c.href} className="hover:text-ink">
                {c.label}
              </LocaleLink>
            ) : (
              <span className={last ? "text-ink" : ""}>
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
