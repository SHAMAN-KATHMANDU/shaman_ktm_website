// Default loading UI for the entire app. Per-route loading.tsx files override
// this for sections that have richer skeletons.

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center">
        {/* A slim gold line travelling along a hairline — square, quiet. */}
        <div className="mx-auto h-px w-40 overflow-hidden bg-line" aria-hidden>
          <div className="h-full w-1/3 bg-metal-deep animate-lux-progress" />
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ink-soft">
          Loading
        </p>
      </div>
    </div>
  );
}
