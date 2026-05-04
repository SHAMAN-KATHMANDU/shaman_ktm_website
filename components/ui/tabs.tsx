"use client";

import { ReactNode, createContext, useContext, useState } from "react";

interface TabsCtx {
  value: string;
  setValue: (v: string) => void;
}

const Ctx = createContext<TabsCtx | null>(null);

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
}: {
  defaultValue: string;
  value?: string;
  onValueChange?: (v: string) => void;
  children: ReactNode;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlledValue ?? internal;
  const setValue = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };
  return <Ctx.Provider value={{ value, setValue }}>{children}</Ctx.Provider>;
}

export function TabList({ children }: { children: ReactNode }) {
  return (
    <div
      className="-mx-4 flex flex-nowrap gap-0 overflow-x-auto border-b border-[var(--color-border)] px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
    >
      {children}
    </div>
  );
}

export function Tab({
  value,
  children,
  badge,
}: {
  value: string;
  children: ReactNode;
  badge?: ReactNode;
}) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Tab must be within Tabs");
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={`relative -mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm transition ${
        active
          ? "text-[var(--color-gold)]"
          : "text-[var(--color-cream)] opacity-60 hover:opacity-100"
      }`}
    >
      {children}
      {badge}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-gold)]" />
      )}
    </button>
  );
}

export function TabPanel({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("TabPanel must be within Tabs");
  if (ctx.value !== value) return null;
  return (
    <div role="tabpanel" className="mt-6 space-y-6">
      {children}
    </div>
  );
}
