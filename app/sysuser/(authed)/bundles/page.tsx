"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/sysuser/form";

interface Row {
  id: string;
  slug: string;
  title: string;
  price: number;
  items: { product: { name: string } }[];
}

export default function BundlesListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/bundles");
    const j = await res.json();
    setRows(j.bundles ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const create = async () => {
    const slug = window.prompt("Bundle slug:");
    if (!slug) return;
    const title = window.prompt("Title:") ?? "Untitled";
    const res = await fetch("/api/sysuser/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title, price: 0, items: [] }),
    });
    if (!res.ok) {
      alert("Create failed");
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
      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
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
              {rows.map((b) => (
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
      )}
    </div>
  );
}
