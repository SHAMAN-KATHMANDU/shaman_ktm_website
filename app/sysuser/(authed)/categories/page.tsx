"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Button,
  Field,
  TextInput,
} from "@/components/sysuser/form";
import { useToast } from "@/components/ui/toast";
import { prompt as askPrompt } from "@/components/ui/prompt";
import { slugifyLite } from "@/components/ui/slug-input";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/components/ui/use-debounce";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { ReorderControls } from "@/components/sysuser/reorder-row";

interface Row {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  position: number;
}

function sortedByPosition(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => a.position - b.position);
}

export default function CategoriesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/categories");
    const j = await res.json();
    setRows(j.categories ?? []);
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
        r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q),
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
    const res = await fetch(`/api/sysuser/categories/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: row.slug,
        name: row.name,
        imageUrl: row.imageUrl,
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

  const create = async () => {
    const name = await askPrompt({
      title: "New category",
      label: "Name",
      placeholder: "e.g. Singing Bowls",
      validate: (v) => (v.trim() ? null : "Name is required"),
    });
    if (!name) return;
    const slug = slugifyLite(name);
    const res = await fetch("/api/sysuser/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, name: name.trim() }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      toast.error(
        "Create failed",
        j?.message ?? "Check slug is unique and lower-kebab-case.",
      );
      return;
    }
    toast.success("Category created", name.trim());
    reload();
  };

  const save = async (row: Row) => {
    const ok = await persistRow(row);
    if (ok) toast.success("Saved", row.name);
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete category “${row.name}”?`)) return;
    const res = await fetch(`/api/sysuser/categories/${row.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted", row.name);
    reload();
  };

  const rowIndexInRows = (id: string) => rows.findIndex((r) => r.id === id);

  const swapAdjacentInOrder = async (sortedIndex: number, dir: -1 | 1) => {
    const sorted = sortedByPosition(rows);
    const j = sortedIndex + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[sortedIndex]!;
    const b = sorted[j]!;
    const pa = a.position;
    const pb = b.position;
    const next = rows.map((r) => {
      if (r.id === a.id) return { ...r, position: pb };
      if (r.id === b.id) return { ...r, position: pa };
      return r;
    });
    setRows(next);
    const aNext = next.find((r) => r.id === a.id)!;
    const bNext = next.find((r) => r.id === b.id)!;
    const [okA, okB] = await Promise.all([
      persistRow(aNext),
      persistRow(bNext),
    ]);
    if (!okA || !okB) void reload();
    else toast.success("Order updated");
  };

  const moveRowInPagedList = (row: Row, dir: -1 | 1) => {
    const sorted = sortedByPosition(rows);
    const sortedIndex = sorted.findIndex((r) => r.id === row.id);
    void swapAdjacentInOrder(sortedIndex, dir);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Categories</h1>
        <Button onClick={create}>+ New</Button>
      </div>

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

      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
        <>
          <div className="space-y-3">
            {paged.map((row) => {
              const i = rowIndexInRows(row.id);
              const sorted = sortedByPosition(rows);
              const si = sorted.findIndex((r) => r.id === row.id);
              return (
                <div
                  key={row.id}
                  className="grid gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-[120px_1fr_1fr_auto_auto]"
                >
                  <Field label="Slug">
                    <TextInput
                      value={row.slug}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = { ...row, slug: e.target.value };
                        setRows(next);
                      }}
                    />
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
                  <Field label="Image URL">
                    <TextInput
                      value={row.imageUrl ?? ""}
                      onChange={(e) => {
                        const next = [...rows];
                        next[i] = {
                          ...row,
                          imageUrl: e.target.value || null,
                        };
                        setRows(next);
                      }}
                    />
                  </Field>
                  <ReorderControls
                    dense
                    disableUp={si <= 0}
                    disableDown={si >= sorted.length - 1}
                    onMoveUp={() => moveRowInPagedList(row, -1)}
                    onMoveDown={() => moveRowInPagedList(row, 1)}
                  />
                  <div className="flex items-end gap-2">
                    <Button onClick={() => save(row)}>Save</Button>
                    <Button variant="danger" onClick={() => remove(row)}>
                      ✕
                    </Button>
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

          <Accordion defaultOpenKey="reorder">
            <AccordionItem
              itemKey="reorder"
              title="Reorder categories"
              subtitle="Move items — order is saved immediately."
            >
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {sortedByPosition(rows).map((row, si) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-base)] px-2 py-1.5 text-sm"
                  >
                    <span className="w-6 font-mono text-[10px] opacity-50">
                      {si + 1}
                    </span>
                    <span className="flex-1 truncate">{row.name}</span>
                    <span className="truncate font-mono text-[10px] opacity-50">
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
