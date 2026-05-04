"use client";

// Site-wide announcement bar. Server component reads the row in SiteShell
// and passes it down. Dismissal is local-only — we keep the dismissed
// message in localStorage keyed by message text so a fresh announcement
// re-appears even after a previous one was dismissed.

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
}

export function AnnouncementBar({ announcement }: { announcement: Announcement }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!announcement.enabled || !announcement.message) return;
    if (!announcement.dismissable) {
      setHidden(false);
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      setHidden(stored === announcement.message);
    } catch {
      setHidden(false);
    }
  }, [announcement.enabled, announcement.message, announcement.dismissable]);

  if (!announcement.enabled || !announcement.message || hidden) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, announcement.message);
    } catch {
      // ignore quota errors
    }
    setHidden(true);
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
