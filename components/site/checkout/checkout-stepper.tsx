interface Props {
  current: 1 | 2 | 3;
}

const STEPS = [
  { n: 1, label: "Review" },
  { n: 2, label: "Delivery" },
  { n: 3, label: "Payment" },
] as const;

export function CheckoutStepper({ current }: Props) {
  return (
    <ol className="flex items-center justify-center gap-4 mb-12">
      {STEPS.map((s, i) => {
        const done = current > s.n;
        const active = current === s.n;
        return (
          <li key={s.n} className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-display border ${
                  active
                    ? "bg-[var(--color-gold)] border-[var(--color-gold)] text-[var(--color-base)]"
                    : done
                      ? "border-[var(--color-gold)] text-[var(--color-gold)]"
                      : "border-[var(--color-border)] text-[var(--color-gold-muted)]"
                }`}
              >
                {s.n}
              </span>
              <span
                className={`label-nav text-[10px] mt-2 ${
                  active || done
                    ? "text-[var(--color-gold)]"
                    : "text-[var(--color-gold-muted)]"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={`w-12 h-px ${
                  done
                    ? "bg-[var(--color-gold)]"
                    : "bg-[var(--color-border)]"
                }`}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
