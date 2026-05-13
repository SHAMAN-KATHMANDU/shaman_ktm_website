"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Layers, Search } from "lucide-react";
import { Button } from "@/components/sysuser/form";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/components/ui/use-debounce";
import { useToast } from "@/components/ui/toast";
import { prompt as askPrompt } from "@/components/ui/prompt";
import { slugifyLite } from "@/components/ui/slug-input";

interface Row {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  _count: { products: number };
}

export default function CollectionsListPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/collections");
    const j = await res.json();
    setRows(j.collections ?? []);
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
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.subtitle?.toLowerCase().includes(q) ?? false),
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

  const create = async () => {
    const title = await askPrompt({
      title: "New collection",
      label: "Title",
      placeholder: "e.g. Singing bowls",
      validate: (v) => (v.trim() ? null : "Title is required"),
    });
    if (!title) return;
    const slug = slugifyLite(title);
    const res = await fetch("/api/sysuser/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title: title.trim(), productIds: [] }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Create failed", j?.message ?? undefined);
      return;
    }
    const j = await res.json();
    window.location.href = `/sysuser/collections/${j.collection.id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Collections</h1>
        <Button onClick={create}>+ New collection</Button>
      </div>

      <Card>
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5">
          <Search size={14} className="opacity-50" />
          <input
            placeholder="Search by title, slug, or subtitle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>
      </Card>

      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm opacity-70">
          <Layers className="mx-auto mb-2 opacity-40" size={24} />
          No collections match.
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-[var(--color-border)]">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-[var(--color-surface)] text-left text-xs uppercase tracking-wider opacity-70">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Slug</th>
                  <th className="p-3">Products</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((c) => (
                  <tr
                    key={c.id}
                    className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                  >
                    <td className="p-3">
                      <Link
                        href={`/sysuser/collections/${c.id}`}
                        className="text-[var(--color-gold)] hover:underline"
                      >
                        {c.title}
                      </Link>
                    </td>
                    <td className="p-3">{c.slug}</td>
                    <td className="p-3">{c._count.products}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={effectivePage}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}
    </div>
  );
}
