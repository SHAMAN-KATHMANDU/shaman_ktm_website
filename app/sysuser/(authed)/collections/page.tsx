"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/sysuser/form";

interface Row {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  _count: { products: number };
}

export default function CollectionsListPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/collections");
    const j = await res.json();
    setRows(j.collections ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const create = async () => {
    const slug = window.prompt("Collection slug:");
    if (!slug) return;
    const title = window.prompt("Title:") ?? "Untitled";
    const res = await fetch("/api/sysuser/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title, productIds: [] }),
    });
    if (!res.ok) {
      alert("Create failed");
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
      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
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
              {rows.map((c) => (
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
      )}
    </div>
  );
}
