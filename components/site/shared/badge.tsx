import type { ReactNode } from "react";
import type { ElementSlug } from "@/lib/api/types";

type Tone = "default" | "element" | "new" | "member" | "offer" | "final";

interface Props {
  tone?: Tone;
  element?: ElementSlug;
  children: ReactNode;
  className?: string;
  /** Explicit accent colour override (border + text); wins over `tone`. */
  color?: string;
}

// Element badges ride the [data-element] CSS mapping: --el draws the
// border (display hue), --el-text sets the AA-legible text shade.
export function Badge({
  tone = "default",
  element,
  children,
  className = "",
  color,
}: Props) {
  let style: React.CSSProperties | undefined;
  let cls =
    "inline-flex items-center label-nav text-[10px] px-2.5 py-1 border bg-surface/80";
  if (color) {
    style = { borderColor: color, color };
  } else if (tone === "element" && element) {
    cls += " border-[var(--el)] text-[var(--el-text)]";
  } else if (tone === "new") {
    cls += " border-accent text-accent-deep";
  } else if (tone === "member") {
    cls += " border-metal text-metal-text";
  } else if (tone === "offer") {
    cls += " border-el-plant text-el-plant-text";
  } else if (tone === "final") {
    cls += " border-rakta text-rakta";
  } else {
    cls += " border-line text-ink-soft";
  }
  return (
    <span
      className={`${cls} ${className}`}
      style={style}
      data-element={tone === "element" && !color ? element : undefined}
    >
      {children}
    </span>
  );
}
