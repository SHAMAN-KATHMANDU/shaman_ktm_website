"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, TextInput } from "@/components/sysuser/form";
import { MarkdownEditor } from "@/components/sysuser/markdown-editor";
import { SeoPanel, type SeoState, emptySeo } from "@/components/sysuser/seo-panel";
import { BilingualField } from "@/components/sysuser/bilingual-field";

interface State {
  slug: string;
  title: string;
  titleNe: string | null;
  bodyMarkdown: string;
  bodyMarkdownNe: string | null;
  seo: SeoState;
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
    titleNe: null,
    bodyMarkdown: "",
    bodyMarkdownNe: null,
    seo: emptySeo(),
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
            titleNe: p.titleNe ?? null,
            bodyMarkdown: p.bodyMarkdown,
            bodyMarkdownNe: p.bodyMarkdownNe ?? null,
            seo: {
              seoTitle: p.seoTitle ?? "",
              seoDescription: p.seoDescription ?? "",
              ogImageUrl: p.ogImageUrl ?? "",
              canonicalUrl: p.canonicalUrl ?? "",
              noindex: !!p.noindex,
              twitterCard: p.twitterCard ?? "summary_large_image",
            },
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
        titleNe: state.titleNe || null,
        bodyMarkdown: state.bodyMarkdown,
        bodyMarkdownNe: state.bodyMarkdownNe || null,
        seoTitle: state.seo.seoTitle || null,
        seoDescription: state.seo.seoDescription || null,
        ogImageUrl: state.seo.ogImageUrl || null,
        canonicalUrl: state.seo.canonicalUrl || null,
        noindex: state.seo.noindex,
        twitterCard: state.seo.twitterCard,
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Edit page</h1>
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
        <BilingualField
          label="Title"
          enValue={state.title}
          neValue={state.titleNe}
          onEnChange={(v) => setState({ ...state, title: v })}
          onNeChange={(v) => setState({ ...state, titleNe: v })}
        />
        <Field label="Slug">
          <TextInput
            value={state.slug}
            onChange={(e) => setState({ ...state, slug: e.target.value })}
          />
        </Field>
      </div>
      <div className="space-y-4">
        <MarkdownEditor
          value={state.bodyMarkdown}
          onChange={(v) => setState({ ...state, bodyMarkdown: v })}
        />
        <Field label="नेपाली (Nepali)">
          <textarea
            rows={8}
            value={state.bodyMarkdownNe ?? ""}
            onChange={(e) =>
              setState({ ...state, bodyMarkdownNe: e.target.value || null })
            }
            placeholder="Body in Nepali (Markdown, optional)"
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none transition focus:border-[var(--color-gold)] disabled:opacity-50"
          />
        </Field>
      </div>
      <div>
        <h2 className="font-display text-2xl mb-3">SEO &amp; Social</h2>
        <SeoPanel
          state={state.seo}
          onChange={(seo) => setState({ ...state, seo })}
          pathPrefix="/pages"
          slug={state.slug}
          fallbackTitle={state.title}
          fallbackDescription=""
        />
      </div>
    </div>
  );
}
