import type { ReactNode } from "react";
import type { ElementSlug } from "@/lib/api/types";
import { ELEMENT_BY_SLUG } from "@/data/mock/elements";

type Tone = "default" | "element" | "new" | "member";

interface Props {
  tone?: Tone;
  element?: ElementSlug;
  children: ReactNode;
  className?: string;
}

export function Badge({
  tone = "default",
  element,
  children,
  className = "",
}: Props) {
  let style: React.CSSProperties | undefined;
  let cls =
    "inline-flex items-center label-nav text-[10px] px-2.5 py-1 border bg-[var(--color-surface)]/80";
  if (tone === "element" && element) {
    const meta = ELEMENT_BY_SLUG[element];
    style = { borderColor: meta.accent, color: meta.accent };
  } else if (tone === "new") {
    cls += " border-[var(--color-success)] text-[var(--color-success)]";
  } else if (tone === "member") {
    cls += " border-[var(--color-gold)] text-[var(--color-gold)]";
  } else {
    cls += " border-[var(--color-border)] text-[var(--color-gold-muted)]";
  }
  return (
    <span className={`${cls} ${className}`} style={style}>
      {children}
    </span>
  );
}
