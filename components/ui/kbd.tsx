export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line border-b-2 bg-surface px-1.5 font-mono text-[10px] font-bold uppercase text-ink-soft">
      {children}
    </kbd>
  );
}
