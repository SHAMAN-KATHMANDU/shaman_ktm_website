"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Checkbox,
  Field,
  Select,
  TextInput,
} from "@/components/sysuser/form";
import { MarkdownEditor } from "@/components/sysuser/markdown-editor";
import { ImageUploader } from "@/components/sysuser/image-uploader";

interface ProductImage {
  url: string;
  alt: string | null;
  position: number;
}

interface ProductVariation {
  sku: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

interface Editing {
  slug: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  thumbnailUrl: string;
  elementSlug: string;
  categoryId: string;
  isFeatured: boolean;
  isNewRelease: boolean;
  position: number;
  status: "draft" | "published" | "archived";
  tags: string;
  images: ProductImage[];
  variations: ProductVariation[];
}

const empty: Editing = {
  slug: "",
  name: "",
  description: "",
  price: 0,
  compareAtPrice: null,
  currency: "NPR",
  thumbnailUrl: "",
  elementSlug: "",
  categoryId: "",
  isFeatured: false,
  isNewRelease: false,
  position: 0,
  status: "published",
  tags: "",
  images: [],
  variations: [],
};

export default function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [state, setState] = useState<Editing>(empty);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [elements, setElements] = useState<{ slug: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/sysuser/products/${id}`).then((r) => r.json()),
      fetch("/api/sysuser/categories").then((r) => r.json()),
      fetch("/api/sysuser/elements").then((r) => r.json()),
    ]).then(([prod, cats, els]) => {
      if (!alive) return;
      const p = prod.product;
      if (p) {
        setState({
          slug: p.slug,
          name: p.name,
          description: p.description ?? "",
          price: p.price ?? 0,
          compareAtPrice: p.compareAtPrice ?? null,
          currency: p.currency ?? "NPR",
          thumbnailUrl: p.thumbnailUrl ?? "",
          elementSlug: p.elementSlug ?? "",
          categoryId: p.categoryId ?? "",
          isFeatured: !!p.isFeatured,
          isNewRelease: !!p.isNewRelease,
          position: p.position ?? 0,
          status: (p.status as Editing["status"]) ?? "published",
          tags: (p.tags ?? []).join(", "),
          images: (p.images ?? []).map(
            (img: { url: string; alt: string | null; position: number }) => ({
              url: img.url,
              alt: img.alt,
              position: img.position,
            }),
          ),
          variations: (p.variations ?? []).map(
            (v: {
              sku: string;
              price: number;
              stock: number;
              attributes: Record<string, string>;
            }) => ({
              sku: v.sku,
              price: v.price,
              stock: v.stock,
              attributes: v.attributes ?? {},
            }),
          ),
        });
      }
      setCategories(cats.categories ?? []);
      setElements(els.elements ?? []);
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
      name: state.name,
      description: state.description,
      price: Number(state.price) || 0,
      compareAtPrice: state.compareAtPrice ?? null,
      currency: state.currency,
      thumbnailUrl: state.thumbnailUrl || null,
      elementSlug: state.elementSlug || null,
      categoryId: state.categoryId || null,
      isFeatured: state.isFeatured,
      isNewRelease: state.isNewRelease,
      position: state.position,
      status: state.status,
      tags: state.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      images: state.images.map((img, idx) => ({
        url: img.url,
        alt: img.alt,
        position: idx,
      })),
      variations: state.variations.map((v) => ({
        sku: v.sku,
        price: Number(v.price) || 0,
        stock: Number(v.stock) || 0,
        attributes: v.attributes ?? {},
      })),
    };
    const res = await fetch(`/api/sysuser/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(j?.message ?? "Save failed");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/sysuser/products/${id}`, { method: "DELETE" });
    router.push("/sysuser/products");
  };

  const addImage = (url: string) => {
    setState((s) => ({
      ...s,
      images: [...s.images, { url, alt: null, position: s.images.length }],
      thumbnailUrl: s.thumbnailUrl || url,
    }));
  };

  const moveImage = (i: number, dir: -1 | 1) => {
    const next = [...state.images];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setState({ ...state, images: next });
  };

  const removeImage = (i: number) => {
    setState({
      ...state,
      images: state.images.filter((_, idx) => idx !== i),
    });
  };

  const addVariation = () => {
    setState({
      ...state,
      variations: [
        ...state.variations,
        {
          sku: state.slug.toUpperCase() + "-" + (state.variations.length + 1),
          price: state.price,
          stock: 0,
          attributes: {},
        },
      ],
    });
  };

  if (loading) return <div className="opacity-60">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Edit product</h1>
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
        <Field label="Name">
          <TextInput
            value={state.name}
            onChange={(e) => setState({ ...state, name: e.target.value })}
          />
        </Field>
        <Field label="Slug">
          <TextInput
            value={state.slug}
            onChange={(e) => setState({ ...state, slug: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Price (NPR)">
          <TextInput
            type="number"
            value={state.price}
            onChange={(e) =>
              setState({ ...state, price: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="Compare-at price (optional)">
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
        <Field label="Currency">
          <TextInput
            value={state.currency}
            onChange={(e) => setState({ ...state, currency: e.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Category">
          <Select
            value={state.categoryId}
            onChange={(e) =>
              setState({ ...state, categoryId: e.target.value })
            }
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Element">
          <Select
            value={state.elementSlug}
            onChange={(e) =>
              setState({ ...state, elementSlug: e.target.value })
            }
          >
            <option value="">— None —</option>
            {elements.map((el) => (
              <option key={el.slug} value={el.slug}>
                {el.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Description (Markdown)">
        <MarkdownEditor
          value={state.description}
          onChange={(v) => setState({ ...state, description: v })}
        />
      </Field>

      <Field label="Images" hint="First image is the thumbnail. Drag with ↑/↓.">
        <div className="space-y-2">
          {state.images.map((img, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-12 w-12 rounded object-cover" />
              <input
                value={img.alt ?? ""}
                placeholder="Alt text…"
                onChange={(e) => {
                  const next = [...state.images];
                  next[i] = { ...next[i], alt: e.target.value };
                  setState({ ...state, images: next });
                }}
                className="flex-1 rounded bg-transparent px-2 py-1 text-sm focus:outline-none"
              />
              <button onClick={() => moveImage(i, -1)} className="text-xs opacity-60">↑</button>
              <button onClick={() => moveImage(i, 1)} className="text-xs opacity-60">↓</button>
              <button onClick={() => removeImage(i)} className="text-xs text-[var(--color-danger)]">✕</button>
            </div>
          ))}
          <ImageUploader onUploaded={addImage} label="+ Upload image" />
        </div>
      </Field>

      <Field label="Variations">
        <div className="space-y-2">
          {state.variations.map((v, i) => (
            <div
              key={i}
              className="grid grid-cols-4 gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
            >
              <TextInput
                value={v.sku}
                placeholder="SKU"
                onChange={(e) => {
                  const next = [...state.variations];
                  next[i] = { ...next[i], sku: e.target.value };
                  setState({ ...state, variations: next });
                }}
              />
              <TextInput
                type="number"
                value={v.price}
                placeholder="Price"
                onChange={(e) => {
                  const next = [...state.variations];
                  next[i] = { ...next[i], price: Number(e.target.value) || 0 };
                  setState({ ...state, variations: next });
                }}
              />
              <TextInput
                type="number"
                value={v.stock}
                placeholder="Stock"
                onChange={(e) => {
                  const next = [...state.variations];
                  next[i] = { ...next[i], stock: Number(e.target.value) || 0 };
                  setState({ ...state, variations: next });
                }}
              />
              <Button
                variant="danger"
                onClick={() =>
                  setState({
                    ...state,
                    variations: state.variations.filter((_, idx) => idx !== i),
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={addVariation}>
            + Add variation
          </Button>
        </div>
      </Field>

      <Field label="Tags" hint="Comma-separated.">
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
                status: e.target.value as Editing["status"],
              })
            }
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <Field label="Featured">
          <div className="pt-2">
            <Checkbox
              label="Show on home"
              checked={state.isFeatured}
              onChange={(e) =>
                setState({ ...state, isFeatured: e.target.checked })
              }
            />
          </div>
        </Field>
        <Field label="New release">
          <div className="pt-2">
            <Checkbox
              label="Show in new releases"
              checked={state.isNewRelease}
              onChange={(e) =>
                setState({ ...state, isNewRelease: e.target.checked })
              }
            />
          </div>
        </Field>
      </div>
    </div>
  );
}
