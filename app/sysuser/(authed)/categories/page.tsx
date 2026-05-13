"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Field,
  TextInput,
} from "@/components/sysuser/form";
import { useToast } from "@/components/ui/toast";
import { prompt as askPrompt } from "@/components/ui/prompt";
import { slugifyLite } from "@/components/ui/slug-input";

interface Row {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  position: number;
}

export default function CategoriesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

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
      toast.error("Create failed", j?.message ?? "Check slug is unique and lower-kebab-case.");
      return;
    }
    toast.success("Category created", name.trim());
    reload();
  };

  const save = async (row: Row) => {
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
      return;
    }
    toast.success("Saved", row.name);
  };

  const remove = async (row: Row) => {
    if (!confirm(`Delete category “${row.name}”?`)) return;
    const res = await fetch(`/api/sysuser/categories/${row.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Deleted", row.name);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Categories</h1>
        <Button onClick={create}>+ New</Button>
      </div>
      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div
              key={row.id}
              className="grid gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-3 md:grid-cols-[120px_1fr_1fr_80px_auto]"
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
                    next[i] = { ...row, imageUrl: e.target.value || null };
                    setRows(next);
                  }}
                />
              </Field>
              <Field label="Pos">
                <TextInput
                  type="number"
                  value={row.position}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i] = { ...row, position: Number(e.target.value) || 0 };
                    setRows(next);
                  }}
                />
              </Field>
              <div className="flex items-end gap-2">
                <Button onClick={() => save(row)}>Save</Button>
                <Button variant="danger" onClick={() => remove(row)}>
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
