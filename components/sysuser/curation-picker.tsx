"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/components/ui/use-debounce";
import { moveBy } from "@/components/sysuser/reorder-row";

export interface CurationItem {
  id: string;
  label: string;
  hint?: string;
}

export function CurationPicker({
  items,
  selectedIds,
  onChange,
  searchPlaceholder = "Search…",
  pageSize: initialPageSize = 10,
}: {
  items: CurationItem[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  searchPlaceholder?: string;
  pageSize?: number;
}) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 200);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        (it.hint?.toLowerCase().includes(q) ?? false) ||
        it.id.toLowerCase().includes(q),
    );
  }, [items, debounced]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const effectivePage = Math.min(page, totalPages);

  const paged = useMemo(
    () =>
      filtered.slice(
        (effectivePage - 1) * pageSize,
        effectivePage * pageSize,
      ),
    [filtered, effectivePage, pageSize],
  );

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id],
    );
  };

  const moveSelected = (id: string, dir: -1 | 1) => {
    const idx = selectedIds.indexOf(id);
    if (idx < 0) return;
    onChange(moveBy(selectedIds, idx, dir));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5">
        <Search size={14} className="opacity-50" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full bg-transparent text-sm focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No matches" description="Try a different search." />
      ) : (
        <>
          <div className="max-h-[min(50vh,420px)] space-y-1 overflow-y-auto">
            {paged.map((it) => {
              const checked = selectedIds.includes(it.id);
              const selIndex = selectedIds.indexOf(it.id);
              return (
                <div
                  key={it.id}
                  className={`flex items-center gap-2 rounded-md border p-2 text-sm transition ${
                    checked
                      ? "border-[var(--color-gold)]/50 bg-[var(--color-gold)]/5"
                      : "border-[var(--color-border)] bg-[var(--color-base)]"
                  }`}
                >
                  <Checkbox checked={checked} onChange={() => toggle(it.id)} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{it.label}</div>
                    {it.hint ? (
                      <div className="truncate font-mono text-[10px] opacity-50">
                        {it.hint}
                      </div>
                    ) : null}
                  </div>
                  {checked && selIndex >= 0 ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className="rounded p-1 opacity-60 hover:bg-[var(--color-surface)] hover:opacity-100"
                        aria-label="Move selection up"
                        disabled={selIndex <= 0}
                        onClick={() => moveSelected(it.id, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 opacity-60 hover:bg-[var(--color-surface)] hover:opacity-100"
                        aria-label="Move selection down"
                        disabled={selIndex >= selectedIds.length - 1}
                        onClick={() => moveSelected(it.id, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <Pagination
            page={effectivePage}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          <div className="text-xs opacity-50">
            {selectedIds.length} selected · {filtered.length} match
            {selectedIds.length > 0 && (
              <span className="ml-2">
                Order:{" "}
                {selectedIds
                  .map((id) => byId.get(id)?.label ?? id)
                  .slice(0, 5)
                  .join(" → ")}
                {selectedIds.length > 5 ? "…" : ""}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
