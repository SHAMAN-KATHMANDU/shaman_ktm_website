"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/sysuser/form";

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  status: string;
  isFeatured: boolean;
  isNewRelease: boolean;
  price: number;
  thumbnailUrl: string | null;
  updatedAt: string;
}

export default function ProductsListPage() {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/products");
    const j = await res.json();
    setRows(j.products ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const bulk = async (
    field: "isFeatured" | "isNewRelease",
    value: boolean,
  ) => {
    if (selected.size === 0) return;
    await fetch("/api/sysuser/products/featured", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), [field]: value }),
    });
    setSelected(new Set());
    await reload();
  };

  const create = async () => {
    const slug = window.prompt("New product slug:");
    if (!slug) return;
    const name = window.prompt("Name:") ?? "Untitled";
    const res = await fetch("/api/sysuser/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        name,
        description: "",
        price: 0,
        currency: "NPR",
        tags: [],
        images: [],
        variations: [],
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      alert(j?.message ?? "Create failed");
      return;
    }
    const j = await res.json();
    window.location.href = `/sysuser/products/${j.product.id}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Products</h1>
        <Button onClick={create}>+ New product</Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm">
        <span className="opacity-60">{selected.size} selected</span>
        <Button
          variant="secondary"
          disabled={!selected.size}
          onClick={() => bulk("isFeatured", true)}
        >
          ★ Set featured
        </Button>
        <Button
          variant="secondary"
          disabled={!selected.size}
          onClick={() => bulk("isFeatured", false)}
        >
          Unfeature
        </Button>
        <Button
          variant="secondary"
          disabled={!selected.size}
          onClick={() => bulk("isNewRelease", true)}
        >
          New release ✓
        </Button>
        <Button
          variant="secondary"
          disabled={!selected.size}
          onClick={() => bulk("isNewRelease", false)}
        >
          Clear new
        </Button>
      </div>

      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
        <div className="overflow-hidden rounded border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface)] text-left text-xs uppercase tracking-wider opacity-70">
              <tr>
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={selected.size > 0 && selected.size === rows.length}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="h-4 w-4 accent-[var(--color-gold)]"
                  />
                </th>
                <th className="p-3">Name</th>
                <th className="p-3">Price</th>
                <th className="p-3">Featured</th>
                <th className="p-3">New</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleOne(p.id)}
                      className="h-4 w-4 accent-[var(--color-gold)]"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {p.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.thumbnailUrl}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div>
                        <Link
                          href={`/sysuser/products/${p.id}`}
                          className="text-[var(--color-gold)] hover:underline"
                        >
                          {p.name}
                        </Link>
                        <div className="text-xs opacity-60">{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">NPR {p.price.toLocaleString()}</td>
                  <td className="p-3">{p.isFeatured ? "★" : "—"}</td>
                  <td className="p-3">{p.isNewRelease ? "✓" : "—"}</td>
                  <td className="p-3 capitalize">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
