"use client";

import { useEffect, useMemo, useState } from "react";
import { Link2, Search } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useDebounce } from "@/components/ui/use-debounce";

export interface PickerLink {
  label: string;
  href: string;
  external?: boolean;
}

interface NavTarget {
  label: string;
  href: string;
  hint?: string;
}

type TargetsResponse = {
  message: string;
  targets: Record<string, NavTarget[]>;
};

const KIND_ORDER: { key: string; label: string }[] = [
  { key: "sections", label: "Sections" },
  { key: "pages", label: "Pages" },
  { key: "products", label: "Products" },
  { key: "categories", label: "Categories" },
  { key: "collections", label: "Collections" },
  { key: "services", label: "Energy services" },
  { key: "stories", label: "Stories" },
  { key: "elements", label: "Nature" },
  { key: "bundles", label: "Bundles" },
];

let cachedTargets: Record<string, NavTarget[]> | null = null;
let inflight: Promise<Record<string, NavTarget[]>> | null = null;

async function loadTargets(): Promise<Record<string, NavTarget[]>> {
  if (cachedTargets) return cachedTargets;
  if (inflight) return inflight;
  inflight = fetch("/api/sysuser/nav-targets", { credentials: "same-origin" })
    .then(async (r) => {
      if (!r.ok) throw new Error(`nav-targets ${r.status}`);
      const json = (await r.json()) as TargetsResponse;
      cachedTargets = json.targets ?? {};
      return cachedTargets;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function LinkDestinationPicker({
  value,
  onChange,
  triggerLabel = "Change…",
  className = "",
  defaultKind,
  hideLabel = false,
}: {
  value: PickerLink;
  onChange: (next: PickerLink) => void;
  triggerLabel?: string;
  className?: string;
  defaultKind?: string;
  hideLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex w-full items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-left text-sm hover:border-[var(--color-gold)] ${className}`}
        title="Pick a destination"
      >
        <Link2 size={12} className="opacity-60" />
        <span className="flex-1 truncate font-mono text-xs">
          {value.href || (
            <span className="opacity-40">No destination — click to pick</span>
          )}
        </span>
        {value.external && (
          <span className="rounded bg-[var(--color-base)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider opacity-70">
            ext
          </span>
        )}
        <span className="text-[10px] uppercase tracking-wider opacity-60">
          {triggerLabel}
        </span>
      </button>
      {open && (
        <PickerDialog
          value={value}
          onChange={(next) => {
            onChange(next);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
          defaultKind={defaultKind}
          hideLabel={hideLabel}
        />
      )}
    </>
  );
}

function PickerDialog({
  value,
  onChange,
  onClose,
  defaultKind,
  hideLabel,
}: {
  value: PickerLink;
  onChange: (next: PickerLink) => void;
  onClose: () => void;
  defaultKind?: string;
  hideLabel?: boolean;
}) {
  const [activeKind, setActiveKind] = useState<string>(
    defaultKind ?? "sections",
  );
  const [targets, setTargets] = useState<Record<string, NavTarget[]> | null>(
    cachedTargets,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 150);
  const [customLabel, setCustomLabel] = useState(value.label);
  const [customHref, setCustomHref] = useState(value.href);
  const [customExternal, setCustomExternal] = useState(!!value.external);

  useEffect(() => {
    let cancelled = false;
    if (!targets) {
      loadTargets()
        .then((t) => {
          if (!cancelled) setTargets(t);
        })
        .catch((e) => {
          if (!cancelled) setLoadError(String(e?.message ?? e));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [targets]);

  const items = useMemo<NavTarget[]>(() => {
    const list = targets?.[activeKind] ?? [];
    const q = debounced.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        it.href.toLowerCase().includes(q) ||
        (it.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [targets, activeKind, debounced]);

  const pick = (t: NavTarget) => {
    onChange({
      label: value.label?.trim() ? value.label : t.label,
      href: t.href,
      external: false,
    });
  };

  const saveCustom = () => {
    const href = customHref.trim();
    if (!href) return;
    onChange({
      label: customLabel.trim() || href,
      href,
      external: customExternal || undefined,
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
      title="Choose link destination"
      description="Pick an existing page or section, or enter a custom URL."
      size="lg"
    >
      <div className="flex h-[28rem] gap-3">
        <aside className="flex w-44 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-[var(--color-border)] pr-2">
          {KIND_ORDER.map(({ key, label }) => {
            const count = targets?.[key]?.length ?? 0;
            const active = key === activeKind;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveKind(key);
                  setSearch("");
                }}
                className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs ${
                  active
                    ? "bg-[var(--color-gold)] text-[var(--color-base)]"
                    : "hover:bg-[var(--color-base)]"
                }`}
              >
                <span>{label}</span>
                {targets && (
                  <span
                    className={`text-[10px] ${
                      active ? "opacity-80" : "opacity-50"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <div className="my-1 border-t border-[var(--color-border)]" />
          <button
            type="button"
            onClick={() => setActiveKind("__custom")}
            className={`rounded px-2 py-1.5 text-left text-xs ${
              activeKind === "__custom"
                ? "bg-[var(--color-gold)] text-[var(--color-base)]"
                : "hover:bg-[var(--color-base)]"
            }`}
          >
            Custom URL
          </button>
        </aside>

        <section className="flex flex-1 flex-col">
          {activeKind === "__custom" ? (
            <div className="space-y-3">
              {!hideLabel && (
                <Field label="Link label">
                  <TextInput
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="e.g. Follow on Instagram"
                  />
                </Field>
              )}
              <Field
                label="URL"
                hint="Use https:// for external links, mailto: / tel: are fine too."
              >
                <TextInput
                  value={customHref}
                  onChange={(e) => setCustomHref(e.target.value)}
                  placeholder="https://… or /custom-path"
                />
              </Field>
              <Switch
                checked={customExternal}
                onChange={setCustomExternal}
                size="sm"
                label="Opens in new tab (external)"
              />
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={saveCustom}
                  disabled={!customHref.trim()}
                >
                  Use this URL
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-2 flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5">
                <Search size={14} className="opacity-50" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${KIND_ORDER.find((k) => k.key === activeKind)?.label.toLowerCase() ?? ""}…`}
                  className="flex-1 bg-transparent text-sm outline-none"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto rounded-md border border-[var(--color-border)]">
                {loadError ? (
                  <EmptyState
                    title="Could not load destinations"
                    description={loadError}
                  />
                ) : !targets ? (
                  <div className="p-6 text-center text-xs opacity-60">
                    Loading…
                  </div>
                ) : items.length === 0 ? (
                  <EmptyState
                    title="Nothing here yet"
                    description={
                      search
                        ? "No matches for that search."
                        : "Create content in the matching admin section, then come back."
                    }
                  />
                ) : (
                  <ul className="divide-y divide-[var(--color-border)]">
                    {items.map((it) => {
                      const isActive = it.href === value.href;
                      return (
                        <li key={it.href}>
                          <button
                            type="button"
                            onClick={() => pick(it)}
                            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--color-base)] ${
                              isActive ? "bg-[var(--color-base)]" : ""
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[var(--color-cream)]">
                                {it.label}
                              </span>
                              <span className="block truncate font-mono text-[11px] opacity-60">
                                {it.href}
                              </span>
                            </span>
                            {isActive && (
                              <span className="rounded bg-[var(--color-gold)] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[var(--color-base)]">
                                current
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </Dialog>
  );
}
