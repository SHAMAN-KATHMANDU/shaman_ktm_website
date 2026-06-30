"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, TextInput } from "@/components/sysuser/form";
import { ProductPicker } from "@/components/sysuser/product-picker";
import { ImageUploader } from "@/components/sysuser/image-uploader";
import { BilingualField } from "@/components/sysuser/bilingual-field";

interface State {
  slug: string;
  title: string;
  titleNe: string | null;
  description: string;
  descriptionNe: string | null;
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
    titleNe: null,
    description: "",
    descriptionNe: null,
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
            titleNe: b.titleNe ?? null,
            description: b.description ?? "",
            descriptionNe: b.descriptionNe ?? null,
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
        titleNe: state.titleNe || null,
        description: state.description || null,
        descriptionNe: state.descriptionNe || null,
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Edit bundle</h1>
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
      <BilingualField
        label="Description"
        enValue={state.description}
        neValue={state.descriptionNe}
        onEnChange={(v) => setState({ ...state, description: v })}
        onNeChange={(v) => setState({ ...state, descriptionNe: v })}
        multiline
      />
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
