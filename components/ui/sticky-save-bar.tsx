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
      className="sticky bottom-0 left-0 right-0 z-30 flex flex-wrap items-center justify-between gap-3 rounded-t-card border-t border-line bg-metal-deep/95 px-3 py-2.5 text-bone shadow-card backdrop-blur sm:px-4 sm:py-3"
      style={{
        animation: "sk-slide-up 200ms ease-out both",
        paddingBottom: "max(0.625rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="h-2 w-2 shrink-0 rounded-full bg-bone" />
        <span className="font-semibold">Unsaved changes</span>
        {lastSavedAt && (
          <span className="hidden text-xs text-bone/70 sm:inline">
            · Last saved {timeAgo(lastSavedAt)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onDiscard && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onDiscard}
            className="border-bone/50 bg-transparent text-bone hover:border-bone hover:bg-transparent"
          >
            Discard
          </Button>
        )}
        <Button onClick={onSave} loading={saving} size="sm">
          <span>Save</span>
          <span className="hidden sm:inline-block">
            <Kbd>⌘S</Kbd>
          </span>
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
