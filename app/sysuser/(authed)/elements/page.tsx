"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button, Field, TextInput } from "@/components/sysuser/form";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/components/ui/use-debounce";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { ReorderControls } from "@/components/sysuser/reorder-row";

interface Row {
  slug: string;
  name: string;
  icon: string;
  accent: string;
  natureSource: string;
  energyDescription: string;
  position: number;
}

function sortedByPosition(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => a.position - b.position);
}

export default function ElementsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/elements");
    const j = await res.json();
    setRows(j.elements ?? []);
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
        r.slug.toLowerCase().includes(q),
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

  const persistRow = async (row: Row) => {
    const res = await fetch(`/api/sysuser/elements/${row.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: row.name,
        icon: row.icon,
        accent: row.accent,
        natureSource: row.natureSource,
        energyDescription: row.energyDescription,
        position: row.position,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Save failed", j?.message ?? undefined);
      return false;
    }
    return true;
  };

  const save = async (row: Row) => {
    const ok = await persistRow(row);
    if (ok) toast.success("Saved", row.name);
  };

  const rowIndex = (slug: string) => rows.findIndex((r) => r.slug === slug);

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

  if (loading) return <div className="opacity-60">Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl sm:text-3xl">Elements</h1>
      <p className="text-sm opacity-60">
        The six nature elements that drive the home grid and product groupings.
      </p>

      <Card>
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5">
          <Search size={14} className="opacity-50" />
          <input
            placeholder="Search by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </Card>

      <div className="space-y-3">
        {paged.map((row) => {
          const i = rowIndex(row.slug);
          const sorted = sortedByPosition(rows);
          const si = sorted.findIndex((r) => r.slug === row.slug);
          return (
            <div
              key={row.slug}
              className="grid gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
              style={{ borderLeft: `4px solid ${row.accent}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <ReorderControls
                  dense
                  disableUp={si <= 0}
                  disableDown={si >= sorted.length - 1}
                  onMoveUp={() => void swapAdjacentInOrder(si, -1)}
                  onMoveDown={() => void swapAdjacentInOrder(si, 1)}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-[100px_1fr_80px_120px_auto]">
                <Field label="Slug">
                  <TextInput value={row.slug} readOnly />
                </Field>
                <Field label="Name">
                  <TextInput
                    value={row.name}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...row, name: e.target.value };
                      setRows(next);
                    }}
                  />
                </Field>
                <Field label="Icon">
                  <TextInput
                    value={row.icon}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...row, icon: e.target.value };
                      setRows(next);
                    }}
                  />
                </Field>
                <Field label="Accent (hex)">
                  <TextInput
                    value={row.accent}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...row, accent: e.target.value };
                      setRows(next);
                    }}
                  />
                </Field>
                <div className="flex items-end">
                  <Button onClick={() => save(row)}>Save</Button>
                </div>
              </div>
              <Field label="Nature source">
                <TextInput
                  value={row.natureSource}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, natureSource: e.target.value };
                    setRows(next);
                  }}
                />
              </Field>
              <Field label="Energy description">
                <TextInput
                  value={row.energyDescription}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = {
                      ...row,
                      energyDescription: e.target.value,
                    };
                    setRows(next);
                  }}
                />
              </Field>
            </div>
          );
        })}
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
          title="Reorder elements"
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
                <span className="flex-1 capitalize">{row.name}</span>
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
    </div>
  );
}
