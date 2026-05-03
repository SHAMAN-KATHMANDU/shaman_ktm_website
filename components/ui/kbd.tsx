export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-base)] px-1.5 font-mono text-[10px] font-medium uppercase opacity-80">
      {children}
    </kbd>
  );
}
