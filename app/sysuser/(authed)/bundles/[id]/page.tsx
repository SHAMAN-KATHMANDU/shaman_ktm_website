"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, TextInput, Textarea } from "@/components/sysuser/form";
import { ProductPicker } from "@/components/sysuser/product-picker";
import { ImageUploader } from "@/components/sysuser/image-uploader";

interface State {
  slug: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  thumbnailUrl: string;
  position: number;
  productIds: string[];
}

export default function BundleEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [state, setState] = useState<State>({
    slug: "",
    title: "",
    description: "",
    price: 0,
    compareAtPrice: null,
    thumbnailUrl: "",
    position: 0,
    productIds: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sysuser/bundles/${id}`)
      .then((r) => r.json())
      .then((j) => {
        const b = j.bundle;
        if (b) {
          setState({
            slug: b.slug,
            title: b.title,
            description: b.description ?? "",
            price: b.price,
            compareAtPrice: b.compareAtPrice ?? null,
            thumbnailUrl: b.thumbnailUrl ?? "",
            position: b.position ?? 0,
            productIds: (b.items ?? []).map(
              (i: { productId: string }) => i.productId,
            ),
          });
        }
        setLoading(false);
      });
  }, [id]);

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/sysuser/bundles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: state.slug,
        title: state.title,
        description: state.description || null,
        price: Number(state.price) || 0,
        compareAtPrice: state.compareAtPrice ?? null,
        thumbnailUrl: state.thumbnailUrl || null,
        position: state.position,
        items: state.productIds.map((productId, idx) => ({
          productId,
          quantity: 1,
          position: idx,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(j?.message ?? "Save failed");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this bundle?")) return;
    await fetch(`/api/sysuser/bundles/${id}`, { method: "DELETE" });
    router.push("/sysuser/bundles");
  };

  if (loading) return <div className="opacity-60">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Edit bundle</h1>
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
      <Field label="Description">
        <Textarea
          rows={3}
          value={state.description}
          onChange={(e) => setState({ ...state, description: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Price (NPR)">
          <TextInput
            type="number"
            value={state.price}
            onChange={(e) =>
              setState({ ...state, price: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="Compare-at price">
          <TextInput
            type="number"
            value={state.compareAtPrice ?? ""}
            onChange={(e) =>
              setState({
                ...state,
                compareAtPrice:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </Field>
      </div>
      <Field label="Thumbnail">
        <div className="flex gap-2">
          <TextInput
            value={state.thumbnailUrl}
            onChange={(e) =>
              setState({ ...state, thumbnailUrl: e.target.value })
            }
          />
          <ImageUploader
            onUploaded={(url) => setState({ ...state, thumbnailUrl: url })}
          />
        </div>
      </Field>
      <Field label="Bundle items" hint="Order matters — first item is shown first.">
        <ProductPicker
          selectedIds={state.productIds}
          onChange={(ids) => setState({ ...state, productIds: ids })}
        />
      </Field>
    </div>
  );
}
