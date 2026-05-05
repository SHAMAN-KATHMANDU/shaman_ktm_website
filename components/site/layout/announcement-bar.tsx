"use client";

// Site-wide announcement bar. SiteShell server-renders an initial
// snapshot from Prisma so the bar paints without a network round-trip,
// and on mount we re-fetch /api/public/v1/announcement so an editor's
// save shows up immediately on the next page load even if any
// upstream layer cached the SSR. Dismissal is local-only — we key the
// dismissed announcement by its updatedAt so every CMS save reappears
// even when the message text is unchanged.

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "sk:announcement-dismissed";

export interface Announcement {
  enabled: boolean;
  message: string;
  href: string | null;
  bgColor: string;
  fgColor: string;
  dismissable: boolean;
  updatedAt?: string;
}

function dismissalKey(a: Announcement): string {
  return a.updatedAt ?? a.message;
}

export function AnnouncementBar({
  announcement: initial,
}: {
  announcement: Announcement;
}) {
  const [announcement, setAnnouncement] = useState(initial);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/public/v1/announcement", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { announcement: Announcement | null }) => {
        if (!cancelled && j.announcement) setAnnouncement(j.announcement);
      })
      .catch(() => {
        // ignore — keep the SSR-provided initial value
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!announcement.dismissable || !announcement.message) {
      setDismissed(false);
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setDismissed(stored === dismissalKey(announcement));
    } catch {
      setDismissed(false);
    }
  }, [announcement]);

  if (!announcement.enabled || !announcement.message || dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, dismissalKey(announcement));
    } catch {
      // ignore quota errors
    }
    setDismissed(true);
  };

  const inner = (
    <span className="text-center flex-1 truncate">{announcement.message}</span>
  );

  return (
    <div
      role="region"
      aria-label="Site announcement"
      className="relative w-full px-6 py-2 text-xs flex items-center gap-3"
      style={{
        backgroundColor: announcement.bgColor,
        color: announcement.fgColor,
      }}
    >
      <div className="mx-auto flex-1 flex items-center justify-center max-w-[1400px]">
        {announcement.href ? (
          <Link
            href={announcement.href}
            className="hover:underline text-center flex-1 truncate"
          >
            {announcement.message}
          </Link>
        ) : (
          inner
        )}
      </div>
      {announcement.dismissable && (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 p-1 hover:opacity-70"
          style={{ color: announcement.fgColor }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
