"use client";

import { useEffect, useState } from "react";
import { Pencil, Tag, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { prompt as askPrompt } from "@/components/ui/prompt";
import { confirm } from "@/components/ui/confirm";

interface Row {
  name: string;
  postCount: number;
}

export default function BlogTagsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const j = await fetch("/api/sysuser/blog/tags").then((r) => r.json());
    setRows(j.tags ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const rename = async (r: Row) => {
    const next = await askPrompt({
      title: `Rename "${r.name}"`,
      label: "New name",
      initial: r.name,
      placeholder: "e.g. shamanism",
      validate: (v) => (v ? null : "Name is required"),
    });
    if (!next || next === r.name) return;
    const res = await fetch("/api/sysuser/blog/tags", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: r.name, to: next }),
    });
    if (!res.ok) {
      toast.error("Rename failed");
      return;
    }
    const j = (await res.json()) as { updated: number };
    toast.success(
      "Renamed",
      `${j.updated} post${j.updated === 1 ? "" : "s"} updated.`,
    );
    reload();
  };

  const remove = async (r: Row) => {
    const ok = await confirm({
      title: `Delete tag "${r.name}"?`,
      description: `This removes the tag from ${r.postCount} post${r.postCount === 1 ? "" : "s"}. The posts themselves stay.`,
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    const res = await fetch(
      `/api/sysuser/blog/tags/${encodeURIComponent(r.name)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted");
    reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: "Content" },
          { label: "Blog", href: "/sysuser/blog" },
          { label: "Tags" },
        ]}
        title="Blog tags"
        description="Aggregated from every blog post. Rename to merge two tags; delete to clear from every post at once."
      />

      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Tag size={20} />}
          title="No tags yet"
          description="Add tags from the Meta tab on any blog post — they'll show up here."
        />
      ) : (
        <Card>
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.name}
                className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] p-3"
              >
                <Tag size={14} className="opacity-60" />
                <div className="flex-1 min-w-0 font-mono text-sm">
                  {r.name}
                </div>
                <Badge tone="muted">
                  {r.postCount} post{r.postCount === 1 ? "" : "s"}
                </Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Pencil size={12} />}
                  onClick={() => rename(r)}
                >
                  Rename
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 size={12} />}
                  onClick={() => remove(r)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
