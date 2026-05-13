"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Package, Search } from "lucide-react";
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
  price: number;
  items: { product: { name: string } }[];
}

export default function BundlesListPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/bundles");
    const j = await res.json();
    setRows(j.bundles ?? []);
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
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        b.items.some((i) => i.product.name.toLowerCase().includes(q)),
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
      title: "New bundle",
      label: "Title",
      placeholder: "e.g. Starter kit",
      validate: (v) => (v.trim() ? null : "Title is required"),
    });
    if (!title) return;
    const slug = slugifyLite(title);
    const res = await fetch("/api/sysuser/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title: title.trim(), price: 0, items: [] }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Create failed", j?.message ?? undefined);
      return;
    }
    const j = await res.json();
    window.location.href = `/sysuser/bundles/${j.bundle.id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Bundles</h1>
        <Button onClick={create}>+ New bundle</Button>
      </div>

      <Card>
        <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5">
          <Search size={14} className="opacity-50" />
          <input
            placeholder="Search by title, slug, or product name…"
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
          <Package className="mx-auto mb-2 opacity-40" size={24} />
          No bundles match.
        </Card>
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-[var(--color-border)]">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-[var(--color-surface)] text-left text-xs uppercase tracking-wider opacity-70">
                <tr>
                  <th className="p-3">Title</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Items</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((b) => (
                  <tr
                    key={b.id}
                    className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                  >
                    <td className="p-3">
                      <Link
                        href={`/sysuser/bundles/${b.id}`}
                        className="text-[var(--color-gold)] hover:underline"
                      >
                        {b.title}
                      </Link>
                      <div className="text-xs opacity-60">{b.slug}</div>
                    </td>
                    <td className="p-3">NPR {b.price.toLocaleString()}</td>
                    <td className="p-3 text-xs opacity-60">
                      {b.items.map((i) => i.product.name).join(" · ") || "—"}
                    </td>
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
