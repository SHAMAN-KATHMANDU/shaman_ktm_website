import type { ReactNode } from "react";

// The one status taxonomy, shared by storefront and (later) admin:
// jade settled · gold waiting · info moving · rakta attention.
// If a state isn't one of these four (or neutral), it isn't a state.
export type PillTone = "settled" | "waiting" | "moving" | "attention" | "neutral";

const TONE_CLASS: Record<PillTone, string> = {
  settled: "bg-accent-tint text-accent-deep",
  waiting: "bg-metal-tint text-metal-ink",
  moving: "bg-info-tint text-info-deep",
  attention: "bg-rakta-tint text-rakta-deep",
  neutral: "bg-surface text-ink-soft",
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wider ${TONE_CLASS[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
