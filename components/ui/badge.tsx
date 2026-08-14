import { ReactNode } from "react";

export type BadgeTone = "neutral" | "gold" | "success" | "danger" | "muted";

// Tones ride the one status taxonomy (see components/shared/status-pill.tsx):
// gold = waiting · success = settled · danger = attention.
const TONE: Record<BadgeTone, string> = {
  neutral: "border-line bg-surface text-ink-soft",
  gold: "border-transparent bg-metal-tint text-metal-ink",
  success: "border-transparent bg-accent-tint text-accent-deep",
  danger: "border-transparent bg-rakta-tint text-rakta-deep",
  muted: "border-line bg-transparent text-ink-soft",
};

export function Badge({
  children,
  tone = "neutral",
  icon,
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${TONE[tone]} ${className}`}
    >
      {icon}
      {children}
    </span>
  );
}
