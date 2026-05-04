// Default loading UI for the entire app. Per-route loading.tsx files override
// this for sections that have richer skeletons.

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-8 h-8 mx-auto border-2 border-[var(--color-border)] border-t-[var(--color-gold)] rounded-full animate-spin" />
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-[var(--color-gold-muted)]">
          Loading
        </p>
      </div>
    </div>
  );
}
