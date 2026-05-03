"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = [10, 25, 50, 100],
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (next: number) => void;
  onPageSizeChange?: (next: number) => void;
  pageSizes?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const prev = () => onPageChange(Math.max(1, page - 1));
  const next = () => onPageChange(Math.min(totalPages, page + 1));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs">
      <div className="opacity-70">
        {total === 0 ? "No results" : `${start}–${end} of ${total}`}
      </div>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <label className="flex items-center gap-1 opacity-70">
            <span className="hidden sm:inline">Per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded border border-[var(--color-border)] bg-[var(--color-base)] px-1 py-0.5 focus:border-[var(--color-gold)] focus:outline-none"
            >
              {pageSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={prev}
          disabled={page <= 1}
          className="flex h-7 w-7 items-center justify-center rounded border border-[var(--color-border)] disabled:opacity-30 hover:enabled:bg-[var(--color-base)]"
          aria-label="Previous page"
        >
          <ChevronLeft size={12} />
        </button>
        <span className="font-mono opacity-70">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={next}
          disabled={page >= totalPages}
          className="flex h-7 w-7 items-center justify-center rounded border border-[var(--color-border)] disabled:opacity-30 hover:enabled:bg-[var(--color-base)]"
          aria-label="Next page"
        >
          <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
}
