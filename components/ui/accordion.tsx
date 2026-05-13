"use client";

import { ChevronDown } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AccordionCtx = {
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
};

const AccordionContext = createContext<AccordionCtx | null>(null);

export function Accordion({
  children,
  defaultOpenKey = null,
  value,
  onValueChange,
}: {
  children: ReactNode;
  /** Uncontrolled: which item starts open (only one at a time). */
  defaultOpenKey?: string | null;
  /** Controlled open key. */
  value?: string | null;
  onValueChange?: (key: string | null) => void;
}) {
  const [uncontrolled, setUncontrolled] = useState<string | null>(
    defaultOpenKey,
  );
  const isControlled = value !== undefined;
  const openKey = isControlled ? value ?? null : uncontrolled;

  const setOpenKey = useCallback(
    (key: string | null) => {
      if (isControlled) onValueChange?.(key);
      else setUncontrolled(key);
    },
    [isControlled, onValueChange],
  );

  const ctx = useMemo(
    () => ({ openKey, setOpenKey }),
    [openKey, setOpenKey],
  );

  return (
    <AccordionContext.Provider value={ctx}>
      <div className="divide-y divide-[var(--color-border)] rounded border border-[var(--color-border)] bg-[var(--color-surface)]">
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  itemKey,
  title,
  subtitle,
  children,
}: {
  itemKey: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  const ctx = useContext(AccordionContext);
  const autoId = useId();
  const panelId = `${autoId}-panel-${itemKey}`;
  const buttonId = `${autoId}-btn-${itemKey}`;

  if (!ctx) {
    throw new Error("AccordionItem must be used inside Accordion");
  }

  const { openKey, setOpenKey } = ctx;
  const expanded = openKey === itemKey;

  const toggle = () => {
    setOpenKey(expanded ? null : itemKey);
  };

  return (
    <div className="bg-[var(--color-base)] first:rounded-t last:rounded-b">
      <button
        id={buttonId}
        type="button"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={toggle}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-[var(--color-surface)]"
      >
        <ChevronDown
          size={16}
          className={`shrink-0 opacity-60 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{title}</div>
          {subtitle ? (
            <div className="text-xs opacity-60">{subtitle}</div>
          ) : null}
        </div>
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[var(--color-border)] px-3 py-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
