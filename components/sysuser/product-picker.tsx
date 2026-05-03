"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, TextInput } from "./form";

interface PickedProduct {
  id: string;
  slug: string;
  name: string;
  thumbnailUrl: string | null;
  price: number;
}

/**
 * Multi-select product picker with search and order. Used by:
 *   • Bundle items
 *   • Collection products
 *   • Element spotlights
 *   • Homepage new releases
 *   • "Frequently bought with"
 *
 * Selected list is the source of truth (parent owns ids[]). Search modal
 * adds/removes; chips can be reordered by ↑/↓ buttons.
 */
export function ProductPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (next: string[]) => void;
}) {
  const [all, setAll] = useState<PickedProduct[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/sysuser/products?light=1")
      .then((r) => r.json())
      .then((j) => setAll(j.products ?? []))
      .catch(() => setAll([]));
  }, []);

  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);
  const selected = selectedIds
    .map((id) => byId.get(id))
    .filter((p): p is PickedProduct => !!p);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return all.slice(0, 30);
    return all
      .filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q))
      .slice(0, 30);
  }, [all, search]);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const move = (i: number, dir: -1 | 1) => {
    const next = [...selectedIds];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {selected.length === 0 && (
          <div className="rounded border border-dashed border-[var(--color-border)] p-4 text-center text-xs opacity-60">
            No products selected
          </div>
        )}
        {selected.map((p, i) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
          >
            <span className="w-6 text-right text-xs opacity-50">{i + 1}.</span>
            {p.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.thumbnailUrl}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
            )}
            <div className="flex-1">
              <div className="text-sm">{p.name}</div>
              <div className="text-xs opacity-60">{p.slug}</div>
            </div>
            <button
              type="button"
              onClick={() => move(i, -1)}
              className="text-xs opacity-60 hover:opacity-100"
              aria-label="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              className="text-xs opacity-60 hover:opacity-100"
              aria-label="Move down"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => toggle(p.id)}
              className="text-xs text-[var(--color-danger)]"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        + Pick products
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg">Pick products</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm opacity-60 hover:opacity-100"
              >
                Close
              </button>
            </div>
            <TextInput
              autoFocus
              placeholder="Search by name or slug…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="mt-3 max-h-96 overflow-y-auto">
              {filtered.map((p) => {
                const checked = selectedIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-[var(--color-base)]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(p.id)}
                      className="h-4 w-4 accent-[var(--color-gold)]"
                    />
                    {p.thumbnailUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbnailUrl}
                        alt=""
                        className="h-8 w-8 rounded object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="text-sm">{p.name}</div>
                      <div className="text-xs opacity-60">{p.slug}</div>
                    </div>
                    <div className="text-xs opacity-60">NPR {p.price}</div>
                  </label>
                );
              })}
              {filtered.length === 0 && (
                <div className="py-6 text-center text-sm opacity-60">
                  No matches
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
