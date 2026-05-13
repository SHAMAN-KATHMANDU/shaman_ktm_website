"use client";

import { ArrowDown, ArrowUp } from "lucide-react";

export function moveBy<T>(arr: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[j]] = [next[j]!, next[index]!];
  return next;
}

export function ReorderControls({
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
  dense,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableUp?: boolean;
  disableDown?: boolean;
  dense?: boolean;
}) {
  const btn =
    "flex items-center justify-center rounded border border-[var(--color-border)] disabled:opacity-30 hover:enabled:bg-[var(--color-surface)]";
  const size = dense ? "h-7 w-7" : "h-8 w-8";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        className={`${btn} ${size}`}
        onClick={onMoveUp}
        disabled={disableUp}
        aria-label="Move up"
      >
        <ArrowUp size={14} />
      </button>
      <button
        type="button"
        className={`${btn} ${size}`}
        onClick={onMoveDown}
        disabled={disableDown}
        aria-label="Move down"
      >
        <ArrowDown size={14} />
      </button>
    </div>
  );
}
