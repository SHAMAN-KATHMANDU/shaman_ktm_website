"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/sysuser/form";
import { useToast } from "@/components/ui/toast";
import { prompt as askPrompt } from "@/components/ui/prompt";
import { slugifyLite } from "@/components/ui/slug-input";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/components/ui/use-debounce";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { ReorderControls } from "@/components/sysuser/reorder-row";

type ElementSlug =
  | "metal"
  | "earth"
  | "wood"
  | "plant"
  | "water"
  | "air";

interface ServiceRow {
  slug: string;
  name: string;
  element: ElementSlug;
  duration: string;
  pricePerSession: number;
  hero: string | null;
  summary: string;
  whatToExpect: string[];
  relatedProductSlugs: string[];
  position: number;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  twitterCard: string;
}

function sortedByPosition(rows: ServiceRow[]): ServiceRow[] {
  return [...rows].sort((a, b) => a.position - b.position);
}

function servicePutPayload(s: ServiceRow) {
  return {
    slug: s.slug,
    name: s.name,
    element: s.element,
    duration: s.duration,
    pricePerSession: s.pricePerSession,
    hero: s.hero,
    summary: s.summary,
    whatToExpect: s.whatToExpect ?? [],
    relatedProductSlugs: s.relatedProductSlugs ?? [],
    position: s.position,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    ogImageUrl: s.ogImageUrl,
    canonicalUrl: s.canonicalUrl,
    noindex: s.noindex,
    twitterCard: s.twitterCard ?? "summary_large_image",
  };
}

function normalizeService(raw: Record<string, unknown>): ServiceRow {
  const el = raw.element as string;
  const element = (
    ["metal", "earth", "wood", "plant", "water", "air"].includes(el)
      ? el
      : "metal"
  ) as ElementSlug;
  return {
    slug: String(raw.slug ?? ""),
    name: String(raw.name ?? ""),
    element,
    duration: String(raw.duration ?? ""),
    pricePerSession: Number(raw.pricePerSession ?? 0),
    hero: (raw.hero as string | null) ?? null,
    summary: String(raw.summary ?? ""),
    whatToExpect: (raw.whatToExpect as string[]) ?? [],
    relatedProductSlugs: (raw.relatedProductSlugs as string[]) ?? [],
    position: Number(raw.position ?? 0),
    seoTitle: (raw.seoTitle as string | null) ?? null,
    seoDescription: (raw.seoDescription as string | null) ?? null,
    ogImageUrl: (raw.ogImageUrl as string | null) ?? null,
    canonicalUrl: (raw.canonicalUrl as string | null) ?? null,
    noindex: Boolean(raw.noindex),
    twitterCard: String(raw.twitterCard ?? "summary_large_image"),
  };
}

export default function ServicesListPage() {
  const toast = useToast();
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/services");
    const j = await res.json();
    const list = (j.services ?? []) as Record<string, unknown>[];
    setRows(list.map(normalizeService));
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial CMS data load
    void reload();
  }, []);

  const filtered = useMemo(() => {
    if (!debouncedSearch.trim()) return rows;
    const q = debouncedSearch.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q),
    );
  }, [rows, debouncedSearch]);

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

  const persistRow = async (row: ServiceRow) => {
    const res = await fetch(`/api/sysuser/services/${row.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(servicePutPayload(row)),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Update failed", j?.message ?? undefined);
      return false;
    }
    return true;
  };

  const swapAdjacentInOrder = async (sortedIndex: number, dir: -1 | 1) => {
    const sorted = sortedByPosition(rows);
    const j = sortedIndex + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[sortedIndex]!;
    const b = sorted[j]!;
    const pa = a.position;
    const pb = b.position;
    const next = rows.map((r) => {
      if (r.slug === a.slug) return { ...r, position: pb };
      if (r.slug === b.slug) return { ...r, position: pa };
      return r;
    });
    setRows(next);
    const aNext = next.find((r) => r.slug === a.slug)!;
    const bNext = next.find((r) => r.slug === b.slug)!;
    const [okA, okB] = await Promise.all([
      persistRow(aNext),
      persistRow(bNext),
    ]);
    if (!okA || !okB) void reload();
    else toast.success("Order updated");
  };

  const create = async () => {
    const name = await askPrompt({
      title: "New service",
      label: "Name",
      placeholder: "e.g. Tibetan Bowl Therapy",
      validate: (v) => (v.trim() ? null : "Name is required"),
    });
    if (!name) return;
    const slug = slugifyLite(name);
    const res = await fetch("/api/sysuser/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        name: name.trim(),
        element: "metal",
        duration: "60 min",
        pricePerSession: 0,
        summary: "",
        whatToExpect: [],
        relatedProductSlugs: [],
        position: rows.length,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Create failed", j?.message ?? undefined);
      return;
    }
    const j = await res.json();
    const s = j.service as Record<string, unknown> | undefined;
    if (s?.slug) window.location.href = `/sysuser/services/${String(s.slug)}`;
    else void reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Services</h1>
        <Button onClick={create}>+ New service</Button>
      </div>

      <Card>
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5">
          <Search size={14} className="opacity-50" />
          <input
            placeholder="Search by name, slug, or summary…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </Card>

      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-[var(--color-border)]">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-[var(--color-surface)] text-left text-xs uppercase tracking-wider opacity-70">
                <tr>
                  <th className="w-10 p-2" aria-label="Reorder" />
                  <th className="p-3">Name</th>
                  <th className="p-3">Element</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Price</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((s) => {
                  const sorted = sortedByPosition(rows);
                  const si = sorted.findIndex((r) => r.slug === s.slug);
                  return (
                    <tr
                      key={s.slug}
                      className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                    >
                      <td className="p-2 align-middle">
                        <ReorderControls
                          dense
                          disableUp={si <= 0}
                          disableDown={si >= sorted.length - 1}
                          onMoveUp={() => void swapAdjacentInOrder(si, -1)}
                          onMoveDown={() => void swapAdjacentInOrder(si, 1)}
                        />
                      </td>
                      <td className="p-3">
                        <Link
                          href={`/sysuser/services/${s.slug}`}
                          className="text-[var(--color-gold)] hover:underline"
                        >
                          {s.name}
                        </Link>
                        <div className="text-xs opacity-60">{s.slug}</div>
                      </td>
                      <td className="p-3 capitalize">{s.element}</td>
                      <td className="p-3">{s.duration}</td>
                      <td className="p-3">
                        NPR {s.pricePerSession.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length > 0 && (
          <Pagination
            page={effectivePage}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
          )}

          <Accordion defaultOpenKey={null}>
            <AccordionItem
              itemKey="reorder"
              title="Reorder services"
              subtitle="Compact list — order saves immediately."
            >
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {sortedByPosition(rows).map((row, si) => (
                  <div
                    key={row.slug}
                    className="flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-base)] px-2 py-1.5 text-sm"
                  >
                    <span className="w-6 font-mono text-[10px] opacity-50">
                      {si + 1}
                    </span>
                    <span className="flex-1 truncate">{row.name}</span>
                    <span className="font-mono text-[10px] opacity-50">
                      {row.slug}
                    </span>
                    <ReorderControls
                      dense
                      disableUp={si <= 0}
                      disableDown={si >= rows.length - 1}
                      onMoveUp={() => void swapAdjacentInOrder(si, -1)}
                      onMoveDown={() => void swapAdjacentInOrder(si, 1)}
                    />
                  </div>
                ))}
              </div>
            </AccordionItem>
          </Accordion>
        </>
      )}
    </div>
  );
}
