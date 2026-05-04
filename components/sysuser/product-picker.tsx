"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/components/ui/use-debounce";

interface PickedProduct {
  id: string;
  slug: string;
  name: string;
  thumbnailUrl: string | null;
  price: number;
  elementSlug: string | null;
  tags: string[];
  status: string;
}

const ELEMENTS = ["metal", "earth", "wood", "plant", "water", "air"] as const;

export function ProductPicker({
  selectedIds,
  onChange,
  emptyText = "No products selected yet.",
  defaultElement,
}: {
  selectedIds: string[];
  onChange: (next: string[]) => void;
  emptyText?: string;
  /** Pre-set the element filter. Useful for element-spotlight pickers. */
  defaultElement?: (typeof ELEMENTS)[number];
}) {
  const [all, setAll] = useState<PickedProduct[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const [element, setElement] = useState<string>(defaultElement ?? "all");
  const [tag, setTag] = useState<string>("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/sysuser/products?light=1")
      .then((r) => r.json())
      .then((j) => setAll(j.products ?? []))
      .catch(() => setAll([]))
      .finally(() => setLoaded(true));
  }, []);

  const catalogEmpty = loaded && all.length === 0;

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of all) for (const t of p.tags ?? []) set.add(t);
    return Array.from(set).sort();
  }, [all]);

  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);
  const selected = selectedIds
    .map((id) => byId.get(id))
    .filter((p): p is PickedProduct => !!p);

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return all.filter((p) => {
      if (element !== "all" && p.elementSlug !== element) return false;
      if (tag && !(p.tags ?? []).includes(tag)) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.slug.includes(q) &&
        !(p.tags ?? []).some((t) => t.toLowerCase().includes(q))
      ) {
        return false;
      }
      return true;
    });
  }, [all, debouncedSearch, element, tag]);

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
      {catalogEmpty && (
        <div className="rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/10 p-3 text-xs">
          No products in the catalog yet. Add products under{" "}
          <Link href="/sysuser/products" className="underline">
            /sysuser/products
          </Link>{" "}
          before curating the homepage.
        </div>
      )}
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
                <div className="flex items-center gap-2 text-[10px] opacity-50">
                  <span>{p.slug}</span>
                  {p.elementSlug && (
                    <span className="rounded bg-[var(--color-surface)] px-1 py-0.5 capitalize">
                      {p.elementSlug}
                    </span>
                  )}
                </div>
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
        description="Filter by element or tag, then tick to include. Order with the arrows after picking."
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2">
            <Search size={14} className="opacity-50" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, slug or tag…"
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider opacity-50">
              Element
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FilterPill
                active={element === "all"}
                onClick={() => setElement("all")}
                label="All"
              />
              {ELEMENTS.map((el) => (
                <FilterPill
                  key={el}
                  active={element === el}
                  onClick={() => setElement(el)}
                  label={el}
                />
              ))}
            </div>
          </div>

          {allTags.length > 0 && (
            <div>
              <div className="mb-1 text-[10px] uppercase tracking-wider opacity-50">
                Tag
              </div>
              <div className="flex flex-wrap gap-1.5">
                <FilterPill
                  active={tag === ""}
                  onClick={() => setTag("")}
                  label="Any"
                />
                {allTags.slice(0, 24).map((t) => (
                  <FilterPill
                    key={t}
                    active={tag === t}
                    onClick={() => setTag(t === tag ? "" : t)}
                    label={t}
                  />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState
              title="No products match"
              description="Try a different element, tag, or search term."
            />
          ) : (
            <div className="max-h-[55vh] space-y-1 overflow-y-auto">
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
                      <div className="flex items-center gap-2 text-[10px] opacity-50">
                        <span>{p.slug}</span>
                        {p.elementSlug && (
                          <span className="rounded bg-[var(--color-surface)] px-1 py-0.5 capitalize">
                            {p.elementSlug}
                          </span>
                        )}
                      </div>
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
            {selectedIds.length} selected · {filtered.length} match
          </div>
        </div>
      </Drawer>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2 py-0.5 text-xs capitalize transition ${
        active
          ? "border-[var(--color-gold)] bg-[var(--color-gold)] text-[var(--color-base)]"
          : "border-[var(--color-border)] opacity-60 hover:border-[var(--color-gold)]/50 hover:opacity-100"
      }`}
    >
      {label}
    </button>
  );
}
