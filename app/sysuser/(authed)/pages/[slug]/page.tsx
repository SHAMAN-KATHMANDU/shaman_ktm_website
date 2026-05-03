"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, TextInput } from "@/components/sysuser/form";
import { MarkdownEditor } from "@/components/sysuser/markdown-editor";

interface State {
  slug: string;
  title: string;
  bodyMarkdown: string;
  seoTitle: string;
  seoDescription: string;
}

export default function PageEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [state, setState] = useState<State>({
    slug: "",
    title: "",
    bodyMarkdown: "",
    seoTitle: "",
    seoDescription: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sysuser/pages/${slug}`)
      .then((r) => r.json())
      .then((j) => {
        const p = j.page;
        if (p) {
          setState({
            slug: p.slug,
            title: p.title,
            bodyMarkdown: p.bodyMarkdown,
            seoTitle: p.seoTitle ?? "",
            seoDescription: p.seoDescription ?? "",
          });
        }
        setLoading(false);
      });
  }, [slug]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/sysuser/pages/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: state.slug,
        title: state.title,
        bodyMarkdown: state.bodyMarkdown,
        seoTitle: state.seoTitle || null,
        seoDescription: state.seoDescription || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(j?.message ?? "Save failed");
      return;
    }
    if (state.slug !== slug) {
      router.push(`/sysuser/pages/${state.slug}`);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this page?")) return;
    await fetch(`/api/sysuser/pages/${slug}`, { method: "DELETE" });
    router.push("/sysuser/pages");
  };

  if (loading) return <div className="opacity-60">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Edit page</h1>
        <div className="flex gap-2">
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
      {error && (
        <div className="rounded bg-[var(--color-danger)]/20 p-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Title">
          <TextInput
            value={state.title}
            onChange={(e) => setState({ ...state, title: e.target.value })}
          />
        </Field>
        <Field label="Slug">
          <TextInput
            value={state.slug}
            onChange={(e) => setState({ ...state, slug: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Body (Markdown)">
        <MarkdownEditor
          value={state.bodyMarkdown}
          onChange={(v) => setState({ ...state, bodyMarkdown: v })}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="SEO title">
          <TextInput
            value={state.seoTitle}
            onChange={(e) => setState({ ...state, seoTitle: e.target.value })}
          />
        </Field>
        <Field label="SEO description">
          <TextInput
            value={state.seoDescription}
            onChange={(e) =>
              setState({ ...state, seoDescription: e.target.value })
            }
          />
        </Field>
      </div>
    </div>
  );
}
