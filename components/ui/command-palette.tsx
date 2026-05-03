"use client";

// ⌘K spotlight for fast nav + actions.
// Closed by default; mounted in the (authed) layout once.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { createPortal } from "react-dom";

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  href?: string;
  group?: string;
  action?: () => void;
}

export function CommandPalette({
  items,
}: {
  items: CommandItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    if (!ql) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(ql) ||
        (i.hint?.toLowerCase().includes(ql) ?? false) ||
        (i.group?.toLowerCase().includes(ql) ?? false),
    );
  }, [q, items]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHighlight(0);
  }, [q]);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const g = item.group ?? "Actions";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(item);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const flatItems = useMemo(
    () => grouped.flatMap(([, list]) => list),
    [grouped],
  );

  const exec = (item: CommandItem) => {
    setOpen(false);
    setQ("");
    if (item.href) router.push(item.href);
    else if (item.action) item.action();
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[950] flex items-start justify-center p-4 pt-24">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl"
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(flatItems.length - 1, h + 1));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(0, h - 1));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            const item = flatItems[highlight];
            if (item) exec(item);
          }
        }}
      >
        <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <Search size={16} className="opacity-50" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <span className="rounded border border-[var(--color-border)] px-1.5 py-0.5 font-mono text-[10px] opacity-50">
            ESC
          </span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {grouped.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm opacity-60">
              No matches
            </div>
          ) : (
            grouped.map(([group, list]) => (
              <div key={group} className="mb-2">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider opacity-50">
                  {group}
                </div>
                {list.map((item) => {
                  const idx = flatItems.indexOf(item);
                  const hl = idx === highlight;
                  return (
                    <button
                      key={item.id}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => exec(item)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                        hl ? "bg-[var(--color-base)]" : ""
                      }`}
                    >
                      <span>{item.label}</span>
                      {item.hint && (
                        <span className="text-xs opacity-50">{item.hint}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
