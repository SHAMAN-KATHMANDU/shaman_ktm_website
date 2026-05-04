"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, TextInput, Textarea } from "@/components/sysuser/form";
import { ProductPicker } from "@/components/sysuser/product-picker";
import { ImageUploader } from "@/components/sysuser/image-uploader";

interface State {
  slug: string;
  title: string;
  subtitle: string;
  heroImageUrl: string;
  position: number;
  productIds: string[];
}

export default function CollectionEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [state, setState] = useState<State>({
    slug: "",
    title: "",
    subtitle: "",
    heroImageUrl: "",
    position: 0,
    productIds: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sysuser/collections/${id}`)
      .then((r) => r.json())
      .then((j) => {
        const c = j.collection;
        if (c) {
          setState({
            slug: c.slug,
            title: c.title,
            subtitle: c.subtitle ?? "",
            heroImageUrl: c.heroImageUrl ?? "",
            position: c.position ?? 0,
            productIds: (c.products ?? []).map(
              (p: { productId: string }) => p.productId,
            ),
          });
        }
        setLoading(false);
      });
  }, [id]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/sysuser/collections/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: state.slug,
        title: state.title,
        subtitle: state.subtitle || null,
        heroImageUrl: state.heroImageUrl || null,
        position: state.position,
        productIds: state.productIds,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(j?.message ?? "Save failed");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this collection?")) return;
    await fetch(`/api/sysuser/collections/${id}`, { method: "DELETE" });
    router.push("/sysuser/collections");
  };

  if (loading) return <div className="opacity-60">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Edit collection</h1>
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
      <Field label="Subtitle">
        <Textarea
          rows={2}
          value={state.subtitle}
          onChange={(e) => setState({ ...state, subtitle: e.target.value })}
        />
      </Field>
      <Field label="Hero image">
        <div className="flex gap-2">
          <TextInput
            value={state.heroImageUrl}
            onChange={(e) =>
              setState({ ...state, heroImageUrl: e.target.value })
            }
          />
          <ImageUploader
            onUploaded={(url) => setState({ ...state, heroImageUrl: url })}
          />
        </div>
      </Field>
      <Field label="Products">
        <ProductPicker
          selectedIds={state.productIds}
          onChange={(ids) => setState({ ...state, productIds: ids })}
        />
      </Field>
    </div>
  );
}
