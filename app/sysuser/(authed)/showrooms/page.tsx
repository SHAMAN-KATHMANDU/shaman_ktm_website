"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button, Field, TextInput, Textarea } from "@/components/sysuser/form";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/components/ui/use-debounce";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { ReorderControls } from "@/components/sysuser/reorder-row";

interface Row {
  key: string;
  name: string;
  address: string;
  whatsapp: string;
  mapEmbedUrl: string | null;
  position: number;
}

function sortedByPosition(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => a.position - b.position);
}

export default function ShowroomsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/showrooms");
    const j = await res.json();
    setRows(j.showrooms ?? []);
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
        r.key.toLowerCase().includes(q) ||
        r.address.toLowerCase().includes(q),
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
    const res = await fetch(`/api/sysuser/showrooms/${row.key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      toast.error("Save failed");
      return false;
    }
    return true;
  };

  const save = async (row: Row) => {
    const ok = await persistRow(row);
    if (ok) toast.success("Saved", row.name);
  };

  const create = async () => {
    const key = window.prompt("Showroom key (e.g. thamel):");
    if (!key) return;
    await fetch("/api/sysuser/showrooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key,
        name: key,
        address: "",
        whatsapp: "",
        mapEmbedUrl: "",
        position: rows.length,
      }),
    });
    reload();
  };

  const remove = async (key: string) => {
    if (!confirm(`Delete showroom “${key}”?`)) return;
    await fetch(`/api/sysuser/showrooms/${key}`, { method: "DELETE" });
    reload();
  };

  const rowIndex = (key: string) => rows.findIndex((r) => r.key === key);

  const swapAdjacentInOrder = async (sortedIndex: number, dir: -1 | 1) => {
    const sorted = sortedByPosition(rows);
    const j = sortedIndex + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[sortedIndex]!;
    const b = sorted[j]!;
    const pa = a.position;
    const pb = b.position;
    const next = rows.map((r) => {
      if (r.key === a.key) return { ...r, position: pb };
      if (r.key === b.key) return { ...r, position: pa };
      return r;
    });
    setRows(next);
    const aNext = next.find((r) => r.key === a.key)!;
    const bNext = next.find((r) => r.key === b.key)!;
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Showrooms</h1>
        <Button onClick={create}>+ New</Button>
      </div>

      <Card>
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5">
          <Search size={14} className="opacity-50" />
          <input
            placeholder="Search by key, name, or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </Card>

      <div className="space-y-3">
        {paged.map((row) => {
          const i = rowIndex(row.key);
          const sorted = sortedByPosition(rows);
          const si = sorted.findIndex((r) => r.key === row.key);
          return (
            <div
              key={row.key}
              className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <ReorderControls
                  dense
                  disableUp={si <= 0}
                  disableDown={si >= sorted.length - 1}
                  onMoveUp={() => void swapAdjacentInOrder(si, -1)}
                  onMoveDown={() => void swapAdjacentInOrder(si, 1)}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Key">
                  <TextInput value={row.key} readOnly />
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
              </div>
              <Field label="Address">
                <Textarea
                  rows={2}
                  value={row.address}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, address: e.target.value };
                    setRows(next);
                  }}
                />
              </Field>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="WhatsApp (E.164, no +)">
                  <TextInput
                    value={row.whatsapp}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...row, whatsapp: e.target.value };
                      setRows(next);
                    }}
                  />
                </Field>
              </div>
              <Field label="Google Maps embed URL">
                <Textarea
                  rows={2}
                  value={row.mapEmbedUrl ?? ""}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = {
                      ...row,
                      mapEmbedUrl: e.target.value || null,
                    };
                    setRows(next);
                  }}
                />
              </Field>
              <div className="mt-2 flex justify-end gap-2">
                <Button variant="danger" onClick={() => remove(row.key)}>
                  Delete
                </Button>
                <Button onClick={() => save(row)}>Save</Button>
              </div>
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
          title="Reorder showrooms"
          subtitle="Compact list — order saves immediately."
        >
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {sortedByPosition(rows).map((row, si) => (
              <div
                key={row.key}
                className="flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-base)] px-2 py-1.5 text-sm"
              >
                <span className="w-6 font-mono text-[10px] opacity-50">
                  {si + 1}
                </span>
                <span className="flex-1 truncate">{row.name}</span>
                <span className="font-mono text-[10px] opacity-50">
                  {row.key}
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
