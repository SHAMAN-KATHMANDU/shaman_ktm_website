"use client";

import { useEffect, useMemo, useState } from "react";
import { HelpCircle, Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FieldGrid } from "@/components/ui/section";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";
import { Badge } from "@/components/ui/badge";
import { BilingualField } from "@/components/sysuser/bilingual-field";
import { useDebounce } from "@/components/ui/use-debounce";
import { FAQ_TOPICS, type FaqTopic } from "@/lib/validation/schemas";

// FAQ questions for /pages/faq, category pages and the home teaser. Each row
// is one question; where it appears is decided by its category (none = the
// FAQ page) and the "show on home" switch.

interface Row {
  id: string;
  question: string;
  questionNe: string | null;
  answer: string;
  answerNe: string | null;
  topic: FaqTopic;
  categoryId: string | null;
  category: { id: string; slug: string; name: string } | null;
  showOnHome: boolean;
  published: boolean;
  position: number;
}

interface CategoryOption {
  id: string;
  name: string;
}

const TOPIC_LABEL: Record<FaqTopic, string> = {
  general: "About us",
  ordering: "Ordering & payment",
  delivery: "Delivery & shipping",
  returns: "Returns & exchanges",
  showrooms: "Showrooms",
  products: "Products & care",
  services: "Sound healing",
};

const NO_CATEGORY = "__none__";

const empty = {
  question: "",
  questionNe: null as string | null,
  answer: "",
  answerNe: null as string | null,
  topic: "general" as FaqTopic,
  categoryId: null as string | null,
  showOnHome: false,
  published: true,
  position: 0,
};

export default function FaqsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const [drawer, setDrawer] = useState<{
    open: boolean;
    editingId: string | null;
    state: typeof empty;
  }>({ open: false, editingId: null, state: empty });

  const reload = async () => {
    const j = await fetch("/api/sysuser/faqs").then((r) => r.json());
    setRows(j.faqs ?? []);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial CMS data load
    void reload();
    void fetch("/api/sysuser/categories")
      .then((r) => r.json())
      .then((j) => setCategories(j.categories ?? []));
  }, []);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (topicFilter === "all" || r.topic === topicFilter) &&
        (!q ||
          r.question.toLowerCase().includes(q) ||
          r.answer.toLowerCase().includes(q) ||
          (r.questionNe?.toLowerCase().includes(q) ?? false)),
    );
  }, [rows, debouncedSearch, topicFilter]);

  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) =>
    setDrawer((s) => ({ ...s, state: { ...s.state, [k]: v } }));

  const openNew = () =>
    setDrawer({
      open: true,
      editingId: null,
      // New questions go to the end of the list.
      state: { ...empty, position: (rows.at(-1)?.position ?? 0) + 10 },
    });

  const openEdit = (r: Row) =>
    setDrawer({
      open: true,
      editingId: r.id,
      state: {
        question: r.question,
        questionNe: r.questionNe,
        answer: r.answer,
        answerNe: r.answerNe,
        topic: r.topic,
        categoryId: r.categoryId,
        showOnHome: r.showOnHome,
        published: r.published,
        position: r.position,
      },
    });

  const close = () => setDrawer({ open: false, editingId: null, state: empty });

  const save = async () => {
    const url = drawer.editingId
      ? `/api/sysuser/faqs/${drawer.editingId}`
      : "/api/sysuser/faqs";
    const res = await fetch(url, {
      method: drawer.editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(drawer.state),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Save failed", j?.message ?? undefined);
      return;
    }
    toast.success("Saved");
    close();
    reload();
  };

  const remove = async (r: Row) => {
    const ok = await confirm({
      title: `Delete "${r.question}"?`,
      description: "To hide it without losing it, switch off Published instead.",
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/sysuser/faqs/${r.id}`, { method: "DELETE" });
    toast.success("Deleted");
    reload();
  };

  const where = (r: Row) =>
    r.category ? `Category: ${r.category.name}` : "FAQ page";

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Content" }, { label: "FAQ" }]}
        title="FAQ"
        description="Questions shown on /pages/faq, on category pages, and in the home-page FAQ section."
        actions={
          <Button icon={<Plus size={12} />} onClick={openNew}>
            New question
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<HelpCircle size={20} />}
          title="No questions yet"
          description="Add the questions customers ask most — each one is shown with search-engine FAQ markup."
          action={
            <Button onClick={openNew} icon={<Plus size={12} />}>
              New question
            </Button>
          }
        />
      ) : (
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex flex-1 items-center gap-2 border border-line bg-bone px-3 py-1.5">
              <Search size={14} className="text-ink-soft" />
              <input
                placeholder="Search questions and answers…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm focus:outline-none"
              />
            </div>
            <div className="w-56">
              <Select
                value={topicFilter}
                onChange={setTopicFilter}
                options={[
                  { value: "all", label: "All topics" },
                  ...FAQ_TOPICS.map((t) => ({ value: t, label: TOPIC_LABEL[t] })),
                ]}
              />
            </div>
          </div>
          <div className="space-y-2">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 border border-line bg-bone p-3"
              >
                <span className="w-10 font-mono text-xs text-ink-soft">{r.position}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{r.question}</p>
                  <p className="text-xs text-ink-soft">
                    {TOPIC_LABEL[r.topic] ?? r.topic} · {where(r)}
                  </p>
                </div>
                {r.showOnHome && <Badge tone="gold">home</Badge>}
                {!r.questionNe && <Badge tone="muted">NE missing</Badge>}
                {r.published ? (
                  <Badge tone="success">published</Badge>
                ) : (
                  <Badge tone="muted">hidden</Badge>
                )}
                <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
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
            {filtered.length === 0 && (
              <p className="py-6 text-center text-sm text-ink-soft">No questions match.</p>
            )}
          </div>
        </Card>
      )}

      <Drawer
        open={drawer.open}
        onOpenChange={(v) => setDrawer((s) => ({ ...s, open: v }))}
        title={drawer.editingId ? "Edit question" : "New question"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <BilingualField
            label="Question"
            required
            enValue={drawer.state.question}
            neValue={drawer.state.questionNe}
            onEnChange={(v) => set("question", v)}
            onNeChange={(v) => set("questionNe", v)}
            placeholder="Do you ship outside Nepal?"
            hint="Phrase it the way a customer would ask, ending with ?"
          />
          <BilingualField
            label="Answer"
            required
            multiline
            enValue={drawer.state.answer}
            neValue={drawer.state.answerNe}
            onEnChange={(v) => set("answer", v)}
            onNeChange={(v) => set("answerNe", v)}
            hint="Markdown: **bold**, [link](/contact), lists with - "
          />
          <FieldGrid cols={2}>
            <Field label="Topic" hint="Section heading on the FAQ page">
              <Select
                value={drawer.state.topic}
                onChange={(v) => set("topic", v as FaqTopic)}
                options={FAQ_TOPICS.map((t) => ({ value: t, label: TOPIC_LABEL[t] }))}
              />
            </Field>
            <Field label="Show on" hint="A category moves it to that category page">
              <Select
                searchable
                value={drawer.state.categoryId ?? NO_CATEGORY}
                onChange={(v) => set("categoryId", v === NO_CATEGORY ? null : v)}
                options={[
                  { value: NO_CATEGORY, label: "FAQ page" },
                  ...categories.map((c) => ({ value: c.id, label: `Category: ${c.name}` })),
                ]}
              />
            </Field>
          </FieldGrid>
          <FieldGrid cols={3}>
            <Field label="Position" hint="Lower comes first">
              <TextInput
                type="number"
                value={String(drawer.state.position)}
                onChange={(e) => set("position", Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Home page">
              <div className="pt-1.5">
                <Switch
                  checked={drawer.state.showOnHome}
                  onChange={(v) => set("showOnHome", v)}
                />
              </div>
            </Field>
            <Field label="Published">
              <div className="pt-1.5">
                <Switch
                  checked={drawer.state.published}
                  onChange={(v) => set("published", v)}
                />
              </div>
            </Field>
          </FieldGrid>
        </div>
      </Drawer>
    </div>
  );
}
