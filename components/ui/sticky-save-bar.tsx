"use client";

import { Button } from "./button";
import { Kbd } from "./kbd";

export function StickySaveBar({
  visible,
  saving,
  onSave,
  onDiscard,
  lastSavedAt,
}: {
  visible: boolean;
  saving?: boolean;
  onSave: () => void;
  onDiscard?: () => void;
  lastSavedAt?: Date | null;
}) {
  if (!visible) return null;

  return (
    <div
      className="sticky bottom-0 left-0 right-0 z-30 flex items-center justify-between gap-4 rounded-t-lg border border-[var(--color-border)] bg-[var(--color-surface)]/95 px-4 py-3 shadow-2xl backdrop-blur"
      style={{ animation: "sk-slide-up 200ms ease-out both" }}
    >
      <div className="flex items-center gap-3 text-sm">
        <span className="h-2 w-2 rounded-full bg-[var(--color-gold)]" />
        <span>Unsaved changes</span>
        {lastSavedAt && (
          <span className="text-xs opacity-50">
            · Last saved {timeAgo(lastSavedAt)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onDiscard && (
          <Button variant="secondary" size="sm" onClick={onDiscard}>
            Discard
          </Button>
        )}
        <Button onClick={onSave} loading={saving} size="sm">
          Save <Kbd>⌘S</Kbd>
        </Button>
      </div>
    </div>
  );
}

function timeAgo(d: Date): string {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return d.toLocaleString();
}
