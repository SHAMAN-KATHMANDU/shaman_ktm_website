import type { ReactNode } from "react";

// The one status taxonomy, shared by storefront and (later) admin:
// jade settled · gold waiting · info moving · rakta attention.
// If a state isn't one of these four (or neutral), it isn't a state.
export type PillTone = "settled" | "waiting" | "moving" | "attention" | "neutral";

// Square tags: a hairline in the tone's own colour over its tint.
const TONE_CLASS: Record<PillTone, string> = {
  settled: "border-accent/35 bg-accent-tint text-accent-deep",
  waiting: "border-metal/45 bg-metal-tint text-metal-ink",
  moving: "border-info/35 bg-info-tint text-info-deep",
  attention: "border-rakta/35 bg-rakta-tint text-rakta-deep",
  neutral: "border-line bg-surface text-ink-soft",
};

/** Order lifecycle → pill tone. Cancellations demand attention;
 *  shipped/in-transit are "in motion" (water-borrowed info). */
export const ORDER_STATUS_TONE: Record<string, PillTone> = {
  pending: "waiting",
  confirmed: "settled",
  shipped: "moving",
  delivered: "settled",
  cancelled: "attention",
};

interface Props {
  tone?: PillTone;
  children: ReactNode;
  className?: string;
}

export function StatusPill({ tone = "neutral", children, className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
