"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Checkbox,
  Field,
  Select,
  TextInput,
  Textarea,
} from "@/components/sysuser/form";
import { MarkdownEditor } from "@/components/sysuser/markdown-editor";
import { ImageUploader } from "@/components/sysuser/image-uploader";

interface BlogPostState {
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  heroImageUrl: string;
  heroVideoEmbedUrl: string;
  authorName: string;
  categorySlug: string;
  tags: string;
  isFeatured: boolean;
  status: "draft" | "published";
  publishedAt: string;
  readingMinutes: number;
  seoTitle: string;
  seoDescription: string;
}

interface BlogCategoryRow {
  slug: string;
  name: string;
}

const empty: BlogPostState = {
  slug: "",
  title: "",
  excerpt: "",
  bodyMarkdown: "",
  heroImageUrl: "",
  heroVideoEmbedUrl: "",
  authorName: "Shaman Kathmandu",
  categorySlug: "",
  tags: "",
  isFeatured: false,
  status: "draft",
  publishedAt: "",
  readingMinutes: 3,
  seoTitle: "",
  seoDescription: "",
};

export default function BlogEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [state, setState] = useState<BlogPostState>(empty);
  const [categories, setCategories] = useState<BlogCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/sysuser/blog/posts/${id}`).then((r) => r.json()),
      fetch("/api/sysuser/blog/categories").then((r) => r.json()),
    ]).then(([post, cats]) => {
      if (!alive) return;
      const p = post.post;
      if (p) {
        setState({
          slug: p.slug ?? "",
          title: p.title ?? "",
          excerpt: p.excerpt ?? "",
          bodyMarkdown: p.bodyMarkdown ?? "",
          heroImageUrl: p.heroImageUrl ?? "",
          heroVideoEmbedUrl: p.heroVideoEmbedUrl ?? "",
          authorName: p.authorName ?? "Shaman Kathmandu",
          categorySlug: p.categorySlug ?? "",
          tags: (p.tags ?? []).join(", "),
          isFeatured: !!p.isFeatured,
          status: (p.status as "draft" | "published") ?? "draft",
          publishedAt: p.publishedAt ?? "",
          readingMinutes: p.readingMinutes ?? 3,
          seoTitle: p.seoTitle ?? "",
          seoDescription: p.seoDescription ?? "",
        });
      }
      setCategories(cats.categories ?? []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const body = {
      slug: state.slug,
      title: state.title,
      excerpt: state.excerpt,
      bodyMarkdown: state.bodyMarkdown,
      heroImageUrl: state.heroImageUrl || null,
      heroVideoEmbedUrl: state.heroVideoEmbedUrl || null,
      authorName: state.authorName,
      categorySlug: state.categorySlug || null,
      tags: state.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      isFeatured: state.isFeatured,
      status: state.status,
      publishedAt:
        state.status === "published"
          ? state.publishedAt || new Date().toISOString()
          : state.publishedAt || null,
      readingMinutes: Number(state.readingMinutes) || 3,
      seoTitle: state.seoTitle || null,
      seoDescription: state.seoDescription || null,
    };
    const res = await fetch(`/api/sysuser/blog/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(j?.message ?? "Save failed");
      return;
    }
  };

  const remove = async () => {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/sysuser/blog/posts/${id}`, { method: "DELETE" });
    router.push("/sysuser/blog");
  };

  if (loading) return <div className="opacity-60">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Edit post</h1>
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

      <Field label="Excerpt" hint="Shown on cards and previews.">
        <Textarea
          rows={2}
          value={state.excerpt}
          onChange={(e) => setState({ ...state, excerpt: e.target.value })}
        />
      </Field>

      <Field label="Hero image URL">
        <div className="flex gap-2">
          <TextInput
            value={state.heroImageUrl}
            onChange={(e) =>
              setState({ ...state, heroImageUrl: e.target.value })
            }
            placeholder="https://media.shamankathmandu.com/…"
          />
          <ImageUploader
            onUploaded={(url) => setState({ ...state, heroImageUrl: url })}
          />
        </div>
      </Field>

      <Field
        label="Featured video (YouTube or Vimeo)"
        hint="If set, the card on the home page plays this instead of showing the hero image."
      >
        <TextInput
          value={state.heroVideoEmbedUrl}
          onChange={(e) =>
            setState({ ...state, heroVideoEmbedUrl: e.target.value })
          }
          placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
        />
      </Field>

      <Field
        label="Body (Markdown)"
        hint="Use the ▶ Video button to embed inline videos. Headings split product tabs but blogs render top-to-bottom."
      >
        <MarkdownEditor
          value={state.bodyMarkdown}
          onChange={(v) => setState({ ...state, bodyMarkdown: v })}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Author">
          <TextInput
            value={state.authorName}
            onChange={(e) => setState({ ...state, authorName: e.target.value })}
          />
        </Field>
        <Field label="Category">
          <Select
            value={state.categorySlug}
            onChange={(e) =>
              setState({ ...state, categorySlug: e.target.value })
            }
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reading minutes">
          <TextInput
            type="number"
            min={1}
            value={state.readingMinutes}
            onChange={(e) =>
              setState({
                ...state,
                readingMinutes: Number(e.target.value) || 1,
              })
            }
          />
        </Field>
      </div>

      <Field label="Tags" hint="Comma-separated. e.g. element:metal, Shaman Stories">
        <TextInput
          value={state.tags}
          onChange={(e) => setState({ ...state, tags: e.target.value })}
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Status">
          <Select
            value={state.status}
            onChange={(e) =>
              setState({
                ...state,
                status: e.target.value as "draft" | "published",
              })
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </Select>
        </Field>
        <Field label="Published at (ISO)">
          <TextInput
            value={state.publishedAt}
            onChange={(e) =>
              setState({ ...state, publishedAt: e.target.value })
            }
            placeholder="2026-05-03T09:00:00.000Z"
          />
        </Field>
        <Field label="Featured on home">
          <div className="pt-2">
            <Checkbox
              label="Show in featured story slot"
              checked={state.isFeatured}
              onChange={(e) =>
                setState({ ...state, isFeatured: e.target.checked })
              }
            />
          </div>
        </Field>
      </div>

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
