"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/sysuser/form";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";

interface PageRow {
  slug: string;
  title: string;
  publishedAt: string;
  updatedAt: string;
}

export default function PagesListPage() {
  const toast = useToast();
  const [rows, setRows] = useState<PageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const res = await fetch("/api/sysuser/pages");
    const j = await res.json();
    setRows(j.pages ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const create = async () => {
    const slug = window.prompt("New page slug:");
    if (!slug) return;
    const title = window.prompt("Title:") ?? "Untitled";
    const res = await fetch("/api/sysuser/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title, bodyMarkdown: "" }),
    });
    if (!res.ok) {
      alert("Create failed");
      return;
    }
    window.location.href = `/sysuser/pages/${slug}`;
  };

  const remove = async (page: PageRow) => {
    const ok = await confirm({
      title: `Delete "${page.title}"?`,
      description: "This cannot be undone.",
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    const res = await fetch(`/api/sysuser/pages/${page.slug}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Pages</h1>
        <Button onClick={create}>+ New page</Button>
      </div>
      {loading ? (
        <div className="text-ink-soft">Loading…</div>
      ) : (
        <div className="overflow-x-auto rounded border border-line">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-soft">
              <tr>
                <th className="p-3">Slug</th>
                <th className="p-3">Title</th>
                <th className="p-3">Updated</th>
                <th className="p-3" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.slug}
                  className="border-t border-line hover:bg-surface"
                >
                  <td className="p-3">
                    <Link
                      href={`/sysuser/pages/${p.slug}`}
                      className="text-metal-text hover:underline"
                    >
                      {p.slug}
                    </Link>
                  </td>
                  <td className="p-3">{p.title}</td>
                  <td className="p-3 text-xs text-ink-soft">
                    {new Date(p.updatedAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="danger"
                      className="px-2 py-1 text-xs"
                      onClick={() => remove(p)}
                    >
                      Delete
                    </Button>
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
