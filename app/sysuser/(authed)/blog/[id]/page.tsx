"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FieldGrid } from "@/components/ui/section";
import { Field, TextInput, Textarea } from "@/components/ui/field";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { NumberInput } from "@/components/ui/number-input";
import { SlugInput } from "@/components/ui/slug-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StickySaveBar } from "@/components/ui/sticky-save-bar";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { MarkdownEditor } from "@/components/sysuser/markdown-editor";
import { ImageUploader } from "@/components/sysuser/image-uploader";
import { SeoPanel, type SeoState, emptySeo } from "@/components/sysuser/seo-panel";
import { useUnsavedGuard } from "@/components/sysuser/use-unsaved-guard";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";
import { normalizeVideoEmbedUrl } from "@/lib/markdown";
import { BilingualField } from "@/components/sysuser/bilingual-field";

interface Editing {
  slug: string;
  title: string;
  titleNe: string | null;
  excerpt: string;
  excerptNe: string | null;
  bodyMarkdown: string;
  bodyMarkdownNe: string | null;
  heroImageUrl: string;
  heroVideoEmbedUrl: string;
  authorName: string;
  categorySlug: string;
  tags: string[];
  isFeatured: boolean;
  status: "draft" | "published";
  publishedAt: string | null;
  readingMinutes: number;
  seo: SeoState;
}

const empty: Editing = {
  slug: "",
  title: "",
  titleNe: null,
  excerpt: "",
  excerptNe: null,
  bodyMarkdown: "",
  bodyMarkdownNe: null,
  heroImageUrl: "",
  heroVideoEmbedUrl: "",
  authorName: "Shaman Kathmandu",
  categorySlug: "",
  tags: [],
  isFeatured: false,
  status: "draft",
  publishedAt: null,
  readingMinutes: 3,
  seo: emptySeo(),
};

export default function BlogEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<Editing>(empty);
  const [snap, setSnap] = useState("");
  const [categories, setCategories] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const dirty = JSON.stringify(state) !== snap;
  useUnsavedGuard(dirty);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/sysuser/blog/posts/${id}`).then((r) => r.json()),
      fetch("/api/sysuser/blog/categories").then((r) => r.json()),
    ]).then(([post, cats]) => {
      if (!alive) return;
      const p = post.post;
      if (p) {
        const next: Editing = {
          slug: p.slug ?? "",
          title: p.title ?? "",
          titleNe: p.titleNe ?? null,
          excerpt: p.excerpt ?? "",
          excerptNe: p.excerptNe ?? null,
          bodyMarkdown: p.bodyMarkdown ?? "",
          bodyMarkdownNe: p.bodyMarkdownNe ?? null,
          heroImageUrl: p.heroImageUrl ?? "",
          heroVideoEmbedUrl: p.heroVideoEmbedUrl ?? "",
          authorName: p.authorName ?? "Shaman Kathmandu",
          categorySlug: p.categorySlug ?? "",
          tags: p.tags ?? [],
          isFeatured: !!p.isFeatured,
          status: p.status ?? "draft",
          publishedAt: p.publishedAt ?? null,
          readingMinutes: p.readingMinutes ?? 3,
          seo: {
            seoTitle: p.seoTitle ?? "",
            seoDescription: p.seoDescription ?? "",
            ogImageUrl: p.ogImageUrl ?? "",
            canonicalUrl: p.canonicalUrl ?? "",
            noindex: !!p.noindex,
            twitterCard: p.twitterCard ?? "summary_large_image",
          },
        };
        setState(next);
        setSnap(JSON.stringify(next));
      }
      setCategories(cats.categories ?? []);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const save = async (override?: { status: "draft" | "published" }) => {
    setSaving(true);
    const nextStatus = override?.status ?? state.status;
    const body = {
      slug: state.slug,
      title: state.title,
      titleNe: state.titleNe ?? null,
      excerpt: state.excerpt,
      excerptNe: state.excerptNe ?? null,
      bodyMarkdown: state.bodyMarkdown,
      bodyMarkdownNe: state.bodyMarkdownNe ?? null,
      heroImageUrl: state.heroImageUrl || null,
      heroVideoEmbedUrl: state.heroVideoEmbedUrl || null,
      authorName: state.authorName,
      categorySlug: state.categorySlug || null,
      tags: state.tags,
      isFeatured: state.isFeatured,
      status: nextStatus,
      publishedAt:
        nextStatus === "published"
          ? state.publishedAt || new Date().toISOString()
          : state.publishedAt,
      readingMinutes: state.readingMinutes,
      seoTitle: state.seo.seoTitle || null,
      seoDescription: state.seo.seoDescription || null,
      ogImageUrl: state.seo.ogImageUrl || null,
      canonicalUrl: state.seo.canonicalUrl || null,
      noindex: state.seo.noindex,
      twitterCard: state.seo.twitterCard,
    };
    const res = await fetch(`/api/sysuser/blog/posts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as
        | { message?: string; errors?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } }
        | null;
      const fieldMsg = j?.errors?.fieldErrors
        ? Object.entries(j.errors.fieldErrors)
            .flatMap(([field, msgs]) => (msgs ?? []).map((m) => `${field}: ${m}`))[0]
        : undefined;
      const formMsg = j?.errors?.formErrors?.[0];
      toast.error("Save failed", fieldMsg ?? formMsg ?? j?.message ?? "Try again.");
      return;
    }
    if (override) {
      const next = { ...state, status: override.status };
      setState(next);
      setSnap(JSON.stringify(next));
    } else {
      setSnap(JSON.stringify(state));
    }
    setLastSavedAt(new Date());
    toast.success(
      override?.status === "published"
        ? "Published"
        : override?.status === "draft"
          ? "Unpublished"
          : "Saved",
      state.title,
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty) save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, dirty]);

  const remove = async () => {
    const ok = await confirm({
      title: `Delete "${state.title}"?`,
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await fetch(`/api/sysuser/blog/posts/${id}`, { method: "DELETE" });
    toast.success("Deleted");
    router.push("/sysuser/blog");
  };

  if (loading) return <div className="opacity-60">Loading…</div>;

  const videoEmbed = state.heroVideoEmbedUrl
    ? normalizeVideoEmbedUrl(state.heroVideoEmbedUrl)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: "Content" },
          { label: "Blog", href: "/sysuser/blog" },
          { label: state.title || "New" },
        ]}
        title={state.title || "Untitled post"}
        description={state.slug || "—"}
        actions={
          <>
            <Badge tone={state.status === "published" ? "success" : "muted"}>
              {state.status}
            </Badge>
            {state.status === "draft" ? (
              <Button
                size="sm"
                loading={saving}
                onClick={() => save({ status: "published" })}
              >
                Publish
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                loading={saving}
                onClick={() => save({ status: "draft" })}
              >
                Unpublish
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<ExternalLink size={12} />}
              disabled={state.status !== "published"}
              onClick={() =>
                window.open(`/stories/${state.slug}`, "_blank")
              }
            >
              Open on site
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={12} />}
              onClick={remove}
            >
              Delete
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Tabs defaultValue="story">
            <TabList>
              <Tab value="story">Story</Tab>
              <Tab value="hero">Hero & Video</Tab>
              <Tab value="meta">Meta</Tab>
              <Tab value="visibility">Visibility</Tab>
              <Tab value="seo">SEO</Tab>
            </TabList>

            <TabPanel value="story">
              <Card>
                <div className="space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <BilingualField
                        label="Title"
                        required
                        enValue={state.title}
                        neValue={state.titleNe}
                        onEnChange={(v) => setState({ ...state, title: v })}
                        onNeChange={(v) => setState({ ...state, titleNe: v })}
                      />
                    </div>
                    <Field label="Slug" hint="URL: /stories/<slug>">
                      <SlugInput
                        value={state.slug}
                        source={state.title}
                        onChange={(v) => setState({ ...state, slug: v })}
                      />
                    </Field>
                  </div>
                  <BilingualField
                    label="Excerpt"
                    multiline
                    enValue={state.excerpt}
                    neValue={state.excerptNe}
                    onEnChange={(v) => setState({ ...state, excerpt: v })}
                    onNeChange={(v) => setState({ ...state, excerptNe: v })}
                    placeholder="Shown on cards and previews."
                  />
                </div>
              </Card>

              <Card
                title="Body"
                description="Markdown. Use ▶ Video on the toolbar to embed YouTube/Vimeo."
              >
                <div className="space-y-6">
                  <MarkdownEditor
                    value={state.bodyMarkdown}
                    onChange={(v) => setState({ ...state, bodyMarkdown: v })}
                  />
                  <div>
                    <Field label="नेपाली (Nepali)">
                      <Textarea
                        rows={8}
                        value={state.bodyMarkdownNe ?? ""}
                        onChange={(e) =>
                          setState({ ...state, bodyMarkdownNe: e.target.value || null })
                        }
                        placeholder="Markdown content in Nepali (optional)"
                        className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-cream)] outline-none transition focus:border-[var(--color-gold)] disabled:opacity-50"
                      />
                    </Field>
                  </div>
                </div>
              </Card>
            </TabPanel>

            <TabPanel value="hero">
              <Card title="Hero image">
                <Field
                  label="Image URL"
                  hint="Falls back to the brand banner if empty."
                >
                  <div className="flex items-center gap-2">
                    <TextInput
                      value={state.heroImageUrl}
                      onChange={(e) =>
                        setState({ ...state, heroImageUrl: e.target.value })
                      }
                      placeholder="https://media.…"
                    />
                    <ImageUploader
                      onUploaded={(url) =>
                        setState({ ...state, heroImageUrl: url })
                      }
                      label="Upload"
                    />
                  </div>
                </Field>
                {state.heroImageUrl && (
                  <div className="mt-3 overflow-hidden rounded border border-[var(--color-border)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={state.heroImageUrl}
                      alt=""
                      className="aspect-[3/2] w-full object-cover"
                    />
                  </div>
                )}
              </Card>

              <Card
                title="Featured video"
                description="Plays on the home page in the featured story slot, replacing the hero image."
              >
                <Field label="YouTube or Vimeo URL">
                  <TextInput
                    value={state.heroVideoEmbedUrl}
                    onChange={(e) =>
                      setState({
                        ...state,
                        heroVideoEmbedUrl: e.target.value,
                      })
                    }
                    placeholder="https://www.youtube.com/watch?v=…"
                  />
                </Field>
                {videoEmbed ? (
                  <div className="mt-3 overflow-hidden rounded border border-[var(--color-border)]">
                    <iframe
                      src={videoEmbed}
                      className="aspect-video w-full"
                      allowFullScreen
                    />
                  </div>
                ) : state.heroVideoEmbedUrl ? (
                  <div className="mt-2 text-xs text-[var(--color-danger)]">
                    URL must be YouTube or Vimeo.
                  </div>
                ) : null}
              </Card>
            </TabPanel>

            <TabPanel value="meta">
              <Card>
                <FieldGrid cols={3}>
                  <Field label="Author">
                    <TextInput
                      value={state.authorName}
                      onChange={(e) =>
                        setState({ ...state, authorName: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Category">
                    <Select
                      value={state.categorySlug}
                      onChange={(v) =>
                        setState({ ...state, categorySlug: v })
                      }
                      options={[
                        { value: "", label: "— None —" },
                        ...categories.map((c) => ({
                          value: c.slug,
                          label: c.name,
                        })),
                      ]}
                      searchable
                    />
                  </Field>
                  <Field label="Reading minutes">
                    <NumberInput
                      value={state.readingMinutes}
                      onChange={(v) =>
                        setState({ ...state, readingMinutes: v ?? 1 })
                      }
                      min={1}
                    />
                  </Field>
                </FieldGrid>
                <div className="mt-4">
                  <Field label="Tags">
                    <TagInput
                      value={state.tags}
                      onChange={(v) => setState({ ...state, tags: v })}
                    />
                  </Field>
                </div>
              </Card>
            </TabPanel>

            <TabPanel value="visibility">
              <Card title="Status">
                <Field label="Publish state">
                  <RadioGroup
                    variant="card"
                    cols={2}
                    value={state.status}
                    onChange={(v) => setState({ ...state, status: v })}
                    options={[
                      {
                        value: "draft",
                        label: "Draft",
                        description: "Hidden until published.",
                      },
                      {
                        value: "published",
                        label: "Published",
                        description: "Live on /stories.",
                      },
                    ]}
                  />
                </Field>
                <div className="mt-4">
                  <Field label="Published at">
                    <DateTimeInput
                      value={state.publishedAt}
                      onChange={(v) =>
                        setState({ ...state, publishedAt: v })
                      }
                    />
                  </Field>
                </div>
              </Card>

              <Card title="Homepage curation">
                <Switch
                  checked={state.isFeatured}
                  onChange={(v) => setState({ ...state, isFeatured: v })}
                  label="Featured on homepage"
                  description="Eligible for the home 'Featured story' slot. The homepage editor must still pick it."
                />
              </Card>
            </TabPanel>

            <TabPanel value="seo">
              <Card title="Search & social">
                <SeoPanel
                  state={state.seo}
                  onChange={(seo) => setState({ ...state, seo })}
                  pathPrefix="/stories"
                  slug={state.slug}
                  fallbackTitle={state.title}
                  fallbackDescription={state.excerpt}
                />
              </Card>
            </TabPanel>
          </Tabs>
        </div>

        <aside className="hidden space-y-4 lg:block">
          <div className="sticky top-20 space-y-4">
            <Card title="Live preview">
              <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-base)]">
                {videoEmbed ? (
                  <iframe
                    src={videoEmbed}
                    className="aspect-video w-full"
                    allowFullScreen
                  />
                ) : state.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.heroImageUrl}
                    alt=""
                    className="aspect-[3/2] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/2] items-center justify-center text-xs opacity-50">
                    No hero
                  </div>
                )}
                <div className="p-3">
                  <div className="font-display text-sm">
                    {state.title || "Untitled"}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs opacity-60">
                    {state.excerpt || "—"}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {state.isFeatured && <Badge tone="gold">★ Featured</Badge>}
                <Badge tone={state.status === "published" ? "success" : "muted"}>
                  {state.status}
                </Badge>
                <Badge tone="neutral">{state.readingMinutes} min</Badge>
              </div>
            </Card>
          </div>
        </aside>
      </div>

      <StickySaveBar
        visible={dirty}
        saving={saving}
        onSave={save}
        onDiscard={() => {
          if (snap) setState(JSON.parse(snap));
        }}
        lastSavedAt={lastSavedAt}
      />
    </div>
  );
}
