import { ReactNode } from "react";

export type BadgeTone = "neutral" | "gold" | "success" | "danger" | "muted";

const TONE: Record<BadgeTone, string> = {
  neutral:
    "border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-cream)]",
  gold:
    "border-[var(--color-gold)] bg-[var(--color-gold)]/15 text-[var(--color-gold)]",
  success:
    "border-[var(--color-success)] bg-[var(--color-success)]/15 text-[var(--color-success)]",
  danger:
    "border-[var(--color-danger)] bg-[var(--color-danger)]/15 text-[var(--color-danger)]",
  muted: "border-[var(--color-border)] bg-transparent text-current opacity-60",
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
