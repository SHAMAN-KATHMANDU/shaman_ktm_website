"use client";

import { useEffect, useRef } from "react";
import { Link2, Link2Off } from "lucide-react";
import { TextInput } from "./field";

export function slugifyLite(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/**
 * Slug field that auto-syncs from a sibling field (e.g. title) until the user
 * types into it manually OR clicks the link icon to break the auto-sync.
 */
export function SlugInput({
  value,
  onChange,
  source,
  placeholder = "auto-from-title",
}: {
  value: string;
  onChange: (next: string) => void;
  source: string;
  placeholder?: string;
}) {
  const linkedRef = useRef<boolean>(value === "" || value === slugifyLite(source));

  useEffect(() => {
    if (linkedRef.current) {
      onChange(slugifyLite(source));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const linked = linkedRef.current;

  return (
    <div className="flex w-full overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-base)] focus-within:border-[var(--color-gold)]">
      <button
        type="button"
        title={linked ? "Linked to title" : "Manual"}
        onClick={() => {
          linkedRef.current = !linkedRef.current;
          if (linkedRef.current) onChange(slugifyLite(source));
        }}
        className={`flex h-9 w-9 items-center justify-center border-r border-[var(--color-border)] transition ${
          linked
            ? "text-[var(--color-gold)]"
            : "text-[var(--color-cream)] opacity-50 hover:opacity-100"
        }`}
      >
        {linked ? <Link2 size={14} /> : <Link2Off size={14} />}
      </button>
      <TextInput
        value={value}
        placeholder={placeholder}
        onChange={(e) => {
          linkedRef.current = false;
          onChange(slugifyLite(e.target.value));
        }}
        className="rounded-none border-0 focus:border-0"
      />
    </div>
  );
}
