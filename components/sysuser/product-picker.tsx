"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";

interface PickedProduct {
  id: string;
  slug: string;
  name: string;
  thumbnailUrl: string | null;
  price: number;
}

export function ProductPicker({
  selectedIds,
  onChange,
  emptyText = "No products selected yet.",
}: {
  selectedIds: string[];
  onChange: (next: string[]) => void;
  emptyText?: string;
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
    if (!q) return all.slice(0, 80);
    return all
      .filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q))
      .slice(0, 80);
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
        {selected.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-base)] p-4 text-center text-xs opacity-60">
            {emptyText}
          </div>
        ) : (
          selected.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] p-2"
            >
              <span className="w-5 text-right font-mono text-[10px] opacity-50">
                {i + 1}
              </span>
              {p.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.thumbnailUrl}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-[var(--color-surface)]" />
              )}
              <div className="flex-1">
                <div className="text-sm">{p.name}</div>
                <div className="text-[10px] opacity-50">{p.slug}</div>
              </div>
              <button
                type="button"
                onClick={() => move(i, -1)}
                className="rounded p-1 opacity-50 hover:bg-[var(--color-surface)] hover:opacity-100"
                aria-label="Move up"
              >
                <ArrowUp size={12} />
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                className="rounded p-1 opacity-50 hover:bg-[var(--color-surface)] hover:opacity-100"
                aria-label="Move down"
              >
                <ArrowDown size={12} />
              </button>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className="rounded p-1 text-[var(--color-danger)] opacity-70 hover:opacity-100"
                aria-label="Remove"
              >
                <X size={12} />
              </button>
            </div>
          ))
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => setOpen(true)}
        icon={<Plus size={12} />}
      >
        Pick products
      </Button>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Pick products"
        description="Tick products to include. Order them with the arrows once added."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2">
            <Search size={14} className="opacity-50" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or slug…"
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title="No products match"
              description="Try a different search term."
            />
          ) : (
            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {filtered.map((p) => {
                const checked = selectedIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`flex w-full items-center gap-3 rounded-md p-2 text-left transition ${
                      checked
                        ? "border border-[var(--color-gold)] bg-[var(--color-gold)]/5"
                        : "border border-transparent hover:bg-[var(--color-base)]"
                    }`}
                  >
                    <Checkbox checked={checked} onChange={() => toggle(p.id)} />
                    {p.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbnailUrl}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-[var(--color-surface)]" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm">{p.name}</div>
                      <div className="text-[10px] opacity-50">{p.slug}</div>
                    </div>
                    <div className="text-xs opacity-60">
                      NPR {p.price.toLocaleString()}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="text-xs opacity-50">
            {selectedIds.length} selected
          </div>
        </div>
      </Drawer>
    </div>
  );
}
