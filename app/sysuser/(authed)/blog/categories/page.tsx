"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Tag, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";
import { SlugInput } from "@/components/ui/slug-input";
import { Pagination } from "@/components/ui/pagination";
import { useDebounce } from "@/components/ui/use-debounce";
import { BilingualField } from "@/components/sysuser/bilingual-field";

interface Row {
  slug: string;
  name: string;
  nameNe: string | null;
  description: string | null;
  descriptionNe: string | null;
}

const empty: Row = { slug: "", name: "", nameNe: null, description: "", descriptionNe: null };

export default function BlogCategoriesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [drawer, setDrawer] = useState<{
    open: boolean;
    editingSlug: string | null;
    state: Row;
  }>({ open: false, editingSlug: null, state: empty });

  const reload = async () => {
    const j = await fetch("/api/sysuser/blog/categories").then((r) => r.json());
    setRows(j.categories ?? []);
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
        r.slug.toLowerCase().includes(q) ||
        (r.description?.toLowerCase().includes(q) ?? false),
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

  const openNew = () =>
    setDrawer({ open: true, editingSlug: null, state: { ...empty } });

  const openEdit = (r: Row) =>
    setDrawer({
      open: true,
      editingSlug: r.slug,
      state: { ...r, description: r.description ?? "", descriptionNe: r.descriptionNe ?? null },
    });

  const save = async () => {
    const body = {
      slug: drawer.state.slug,
      name: drawer.state.name,
      nameNe: drawer.state.nameNe ?? null,
      description: drawer.state.description || null,
      descriptionNe: drawer.state.descriptionNe ?? null,
    };
    const url = drawer.editingSlug
      ? `/api/sysuser/blog/categories/${drawer.editingSlug}`
      : "/api/sysuser/blog/categories";
    const method = drawer.editingSlug ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Save failed", j?.message ?? undefined);
      return;
    }
    toast.success("Saved");
    setDrawer({ open: false, editingSlug: null, state: empty });
    reload();
  };

  const remove = async (r: Row) => {
    const ok = await confirm({
      title: `Delete "${r.name}"?`,
      description:
        "Posts assigned to this category will keep working — their categorySlug becomes null.",
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/sysuser/blog/categories/${r.slug}`, { method: "DELETE" });
    toast.success("Deleted");
    reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: "Content" },
          { label: "Blog", href: "/sysuser/blog" },
          { label: "Categories" },
        ]}
        title="Blog categories"
        description="Group blog posts by topic. Used in /stories filters and breadcrumbs."
        actions={
          <Button icon={<Plus size={12} />} onClick={openNew}>
            New category
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Tag size={20} />}
          title="No categories yet"
          description="Create one to start grouping blog posts."
          action={
            <Button onClick={openNew} icon={<Plus size={12} />}>
              New category
            </Button>
          }
        />
      ) : (
        <Card>
          <div className="mb-3 flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-1.5">
            <Search size={14} className="opacity-50" />
            <input
              placeholder="Search by name, slug, or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            {paged.map((r) => (
              <div
                key={r.slug}
                className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base">{r.name}</div>
                  <div className="font-mono text-xs opacity-60">{r.slug}</div>
                  {r.description && (
                    <div className="mt-1 text-xs opacity-70">
                      {r.description}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEdit(r)}
                >
                  Edit
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
          {filtered.length > 0 && (
            <Pagination
              page={effectivePage}
              pageSize={pageSize}
              total={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </Card>
      )}

      <Drawer
        open={drawer.open}
        onOpenChange={(v) => setDrawer((s) => ({ ...s, open: v }))}
        title={drawer.editingSlug ? "Edit category" : "New category"}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                setDrawer({ open: false, editingSlug: null, state: empty })
              }
            >
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <BilingualField
            label="Name"
            required
            enValue={drawer.state.name}
            neValue={drawer.state.nameNe}
            onEnChange={(v) =>
              setDrawer((s) => ({
                ...s,
                state: { ...s.state, name: v },
              }))
            }
            onNeChange={(v) =>
              setDrawer((s) => ({
                ...s,
                state: { ...s.state, nameNe: v },
              }))
            }
          />
          <Field label="Slug" required hint="Used in URLs and filters.">
            <SlugInput
              value={drawer.state.slug}
              source={drawer.state.name}
              onChange={(v) =>
                setDrawer((s) => ({ ...s, state: { ...s.state, slug: v } }))
              }
            />
          </Field>
          <div className="space-y-3">
            <Field label="Description (optional)">
              <Textarea
                rows={3}
                value={drawer.state.description ?? ""}
                onChange={(e) =>
                  setDrawer((s) => ({
                    ...s,
                    state: { ...s.state, description: e.target.value },
                  }))
                }
              />
            </Field>
            <Field label="नेपाली (Nepali)">
              <Textarea
                rows={3}
                value={drawer.state.descriptionNe ?? ""}
                onChange={(e) =>
                  setDrawer((s) => ({
                    ...s,
                    state: { ...s.state, descriptionNe: e.target.value || null },
                  }))
                }
                placeholder="Description in Nepali (optional)"
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none transition focus:border-[var(--color-gold)] disabled:opacity-50"
              />
            </Field>
          </div>
        </div>
      </Drawer>
    </div>
  );
}
