"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Star, Trash2, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FieldGrid } from "@/components/ui/section";
import { Field, TextInput } from "@/components/ui/field";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RadioGroup } from "@/components/ui/radio-group";
import { Select } from "@/components/ui/select";
import { TagInput } from "@/components/ui/tag-input";
import { NumberInput } from "@/components/ui/number-input";
import { MoneyInput } from "@/components/ui/money-input";
import { SlugInput } from "@/components/ui/slug-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StickySaveBar } from "@/components/ui/sticky-save-bar";
import { MarkdownEditor } from "@/components/sysuser/markdown-editor";
import { ImageUploader } from "@/components/sysuser/image-uploader";
import { SeoPanel, type SeoState, emptySeo } from "@/components/sysuser/seo-panel";
import { useUnsavedGuard } from "@/components/sysuser/use-unsaved-guard";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";

interface ProductImageState {
  url: string;
  alt: string | null;
  position: number;
}

interface ProductVariationState {
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
  vendorId: string;
  elementSlug: string;
  categoryId: string;
  isFeatured: boolean;
  isNewRelease: boolean;
  priceOnEnquiry: boolean;
  position: number;
  status: "draft" | "published" | "archived";
  publishedAt: string | null;
  tags: string[];
  images: ProductImageState[];
  variations: ProductVariationState[];
  seo: SeoState;
}

const empty: Editing = {
  slug: "",
  name: "",
  description: "",
  price: 0,
  compareAtPrice: null,
  currency: "NPR",
  thumbnailUrl: "",
  vendorId: "",
  elementSlug: "",
  categoryId: "",
  isFeatured: false,
  isNewRelease: false,
  priceOnEnquiry: false,
  position: 0,
  status: "published",
  publishedAt: null,
  tags: [],
  images: [],
  variations: [],
  seo: emptySeo(),
};

const ELEMENT_OPTIONS = [
  { value: "metal", label: "Metal", accent: "#9b8b6e" },
  { value: "earth", label: "Earth", accent: "#6b5e3a" },
  { value: "wood", label: "Wood", accent: "#3d5a2e" },
  { value: "plant", label: "Plant", accent: "#4a6741" },
  { value: "water", label: "Water", accent: "#2a5a6b" },
  { value: "air", label: "Air", accent: "#4a5270" },
];

export default function ProductEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<Editing>(empty);
  const [snap, setSnap] = useState<string>("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [tab, setTab] = useState("overview");

  const dirty = JSON.stringify(state) !== snap;
  useUnsavedGuard(dirty);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`/api/sysuser/products/${id}`).then((r) => r.json()),
      fetch("/api/sysuser/categories").then((r) => r.json()),
    ]).then(([prod, cats]) => {
      if (!alive) return;
      const p = prod.product;
      if (p) {
        const next: Editing = {
          slug: p.slug,
          name: p.name,
          description: p.description ?? "",
          price: p.price ?? 0,
          compareAtPrice: p.compareAtPrice ?? null,
          currency: p.currency ?? "NPR",
          thumbnailUrl: p.thumbnailUrl ?? "",
          vendorId: p.vendorId ?? "",
          elementSlug: p.elementSlug ?? "",
          categoryId: p.categoryId ?? "",
          isFeatured: !!p.isFeatured,
          isNewRelease: !!p.isNewRelease,
          priceOnEnquiry: !!p.priceOnEnquiry,
          position: p.position ?? 0,
          status: p.status ?? "published",
          publishedAt: p.publishedAt ?? null,
          tags: p.tags ?? [],
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

  const save = async () => {
    setSaving(true);
    const body = {
      slug: state.slug,
      name: state.name,
      description: state.description,
      price: state.price,
      compareAtPrice: state.compareAtPrice ?? null,
      currency: state.currency,
      thumbnailUrl: state.thumbnailUrl || null,
      vendorId: state.vendorId || null,
      elementSlug: state.elementSlug || null,
      categoryId: state.categoryId || null,
      isFeatured: state.isFeatured,
      isNewRelease: state.isNewRelease,
      priceOnEnquiry: state.priceOnEnquiry,
      position: state.position,
      status: state.status,
      publishedAt: state.publishedAt,
      tags: state.tags,
      images: state.images.map((img, idx) => ({
        url: img.url,
        alt: img.alt,
        position: idx,
      })),
      variations: state.variations.map((v) => ({
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        attributes: v.attributes,
      })),
      seoTitle: state.seo.seoTitle || null,
      seoDescription: state.seo.seoDescription || null,
      ogImageUrl: state.seo.ogImageUrl || null,
      canonicalUrl: state.seo.canonicalUrl || null,
      noindex: state.seo.noindex,
      twitterCard: state.seo.twitterCard,
    };
    const res = await fetch(`/api/sysuser/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Save failed", j?.message ?? "Try again.");
      return;
    }
    setSnap(JSON.stringify(state));
    setLastSavedAt(new Date());
    toast.success("Saved", state.name);
  };

  // ⌘S binding
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
      title: `Delete "${state.name}"?`,
      description:
        "This cannot be undone. Linked bundles and collections will lose this item.",
      variant: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    await fetch(`/api/sysuser/products/${id}`, { method: "DELETE" });
    toast.success("Deleted");
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
  const removeImage = (i: number) =>
    setState({
      ...state,
      images: state.images.filter((_, idx) => idx !== i),
    });
  const setThumbnail = (url: string) =>
    setState({ ...state, thumbnailUrl: url });

  const addVariation = () => {
    setState({
      ...state,
      variations: [
        ...state.variations,
        {
          sku:
            state.slug.toUpperCase() + "-" + (state.variations.length + 1),
          price: state.price,
          stock: 0,
          attributes: {},
        },
      ],
    });
  };

  if (loading) return <div className="opacity-60">Loading…</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: "Catalog" },
          { label: "Products", href: "/sysuser/products" },
          { label: state.name || "New" },
        ]}
        title={state.name || "Untitled product"}
        description={state.slug || "—"}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<ExternalLink size={12} />}
              onClick={() =>
                window.open(`/products/${state.slug}`, "_blank")
              }
              disabled={state.status !== "published"}
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
          <Tabs defaultValue="overview" value={tab} onValueChange={setTab}>
            <TabList>
              <Tab value="overview">Overview</Tab>
              <Tab value="media">Media</Tab>
              <Tab value="description">Description</Tab>
              <Tab value="pricing">Pricing & Variants</Tab>
              <Tab value="visibility">Visibility</Tab>
              <Tab value="seo">SEO</Tab>
            </TabList>

            <TabPanel value="overview">
              <Card>
                <FieldGrid cols={2}>
                  <Field label="Name" required>
                    <TextInput
                      value={state.name}
                      onChange={(e) =>
                        setState({ ...state, name: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Slug" hint="URL: /products/<slug>">
                    <SlugInput
                      value={state.slug}
                      source={state.name}
                      onChange={(v) => setState({ ...state, slug: v })}
                    />
                  </Field>
                </FieldGrid>
                <div className="mt-4">
                  <Field label="Element">
                    <RadioGroup
                      variant="card"
                      cols={6}
                      value={state.elementSlug || undefined}
                      onChange={(v) =>
                        setState({ ...state, elementSlug: v })
                      }
                      options={ELEMENT_OPTIONS}
                    />
                  </Field>
                </div>
                <div className="mt-4">
                  <Field
                    label="Category"
                    hint="Drives the /nature/<element> listings."
                  >
                    <Select
                      value={state.categoryId}
                      onChange={(v) =>
                        setState({ ...state, categoryId: v })
                      }
                      options={[
                        { value: "", label: "— None —" },
                        ...categories.map((c) => ({
                          value: c.id,
                          label: c.name,
                        })),
                      ]}
                      searchable
                    />
                  </Field>
                </div>
                <div className="mt-4">
                  <Field label="Tags" hint="Used by search and filters.">
                    <TagInput
                      value={state.tags}
                      onChange={(v) => setState({ ...state, tags: v })}
                    />
                  </Field>
                </div>
                <div className="mt-4">
                  <Field
                    label="Vendor / supplier ID"
                    hint="Optional internal reference for the source vendor."
                  >
                    <TextInput
                      value={state.vendorId}
                      onChange={(e) =>
                        setState({ ...state, vendorId: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </Card>
            </TabPanel>

            <TabPanel value="media">
              <Card
                title="Images"
                description="The first image is the public thumbnail. Reorder with ↑ / ↓."
              >
                <div className="space-y-2">
                  {state.images.length === 0 && (
                    <div className="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center text-xs opacity-60">
                      No images yet — upload one to get started.
                    </div>
                  )}
                  {state.images.map((img, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] p-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        className="h-14 w-14 rounded object-cover"
                      />
                      <div className="flex-1 space-y-1">
                        <input
                          value={img.alt ?? ""}
                          placeholder="Alt text…"
                          onChange={(e) => {
                            const next = [...state.images];
                            next[i] = { ...next[i], alt: e.target.value };
                            setState({ ...state, images: next });
                          }}
                          className="w-full rounded bg-transparent text-sm focus:outline-none"
                        />
                        <div className="font-mono text-[10px] opacity-50">
                          {img.url.split("/").pop()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setThumbnail(img.url)}
                        title="Set as thumbnail"
                        className={`rounded p-1 transition ${
                          state.thumbnailUrl === img.url
                            ? "text-[var(--color-gold)]"
                            : "opacity-50 hover:opacity-100"
                        }`}
                      >
                        <Star
                          size={14}
                          fill={
                            state.thumbnailUrl === img.url
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(i, -1)}
                        className="rounded p-1 opacity-50 hover:opacity-100"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(i, 1)}
                        className="rounded p-1 opacity-50 hover:opacity-100"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="rounded p-1 text-[var(--color-danger)] opacity-70 hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <ImageUploader onUploaded={addImage} label="+ Upload image" />
                </div>
              </Card>
            </TabPanel>

            <TabPanel value="description">
              <Card
                title="Description"
                description="Markdown. Use ## How to Use / ## Element Story / ## Care Instructions to drive product page tabs."
              >
                <MarkdownEditor
                  value={state.description}
                  onChange={(v) => setState({ ...state, description: v })}
                />
              </Card>
            </TabPanel>

            <TabPanel value="pricing">
              <Card title="Pricing">
                <FieldGrid cols={3}>
                  <Field label="Price" required>
                    <MoneyInput
                      value={state.price}
                      onChange={(v) =>
                        setState({ ...state, price: v ?? 0 })
                      }
                      currency={state.currency}
                    />
                  </Field>
                  <Field
                    label="Compare-at price"
                    hint="Shown struck-through if set."
                  >
                    <MoneyInput
                      value={state.compareAtPrice}
                      onChange={(v) =>
                        setState({ ...state, compareAtPrice: v })
                      }
                      currency={state.currency}
                    />
                  </Field>
                  <Field label="Currency">
                    <Select
                      value={state.currency}
                      onChange={(v) => setState({ ...state, currency: v })}
                      options={[
                        { value: "NPR", label: "NPR" },
                        { value: "USD", label: "USD" },
                        { value: "EUR", label: "EUR" },
                      ]}
                    />
                  </Field>
                </FieldGrid>
              </Card>

              <Card
                title="Variants"
                description="Optional SKUs with their own price + stock + attributes."
                actions={
                  <Button size="sm" variant="secondary" onClick={addVariation}>
                    + Add variant
                  </Button>
                }
              >
                {state.variations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[var(--color-border)] p-6 text-center text-xs opacity-60">
                    No variants — the product sells as a single item.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {state.variations.map((v, i) => (
                      <div
                        key={i}
                        className="grid gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] p-3 md:grid-cols-[1fr_140px_120px_auto]"
                      >
                        <Field label="SKU">
                          <TextInput
                            value={v.sku}
                            onChange={(e) => {
                              const next = [...state.variations];
                              next[i] = { ...next[i], sku: e.target.value };
                              setState({ ...state, variations: next });
                            }}
                          />
                        </Field>
                        <Field label="Price">
                          <MoneyInput
                            value={v.price}
                            onChange={(val) => {
                              const next = [...state.variations];
                              next[i] = { ...next[i], price: val ?? 0 };
                              setState({ ...state, variations: next });
                            }}
                            currency={state.currency}
                          />
                        </Field>
                        <Field label="Stock">
                          <NumberInput
                            value={v.stock}
                            onChange={(val) => {
                              const next = [...state.variations];
                              next[i] = { ...next[i], stock: val ?? 0 };
                              setState({ ...state, variations: next });
                            }}
                            min={0}
                          />
                        </Field>
                        <div className="flex items-end">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              setState({
                                ...state,
                                variations: state.variations.filter(
                                  (_, idx) => idx !== i,
                                ),
                              })
                            }
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabPanel>

            <TabPanel value="visibility">
              <Card title="Status">
                <Field label="Publish state">
                  <RadioGroup
                    variant="card"
                    cols={3}
                    value={state.status}
                    onChange={(v) => setState({ ...state, status: v })}
                    options={[
                      {
                        value: "draft",
                        label: "Draft",
                        description: "Hidden from the public site.",
                      },
                      {
                        value: "published",
                        label: "Published",
                        description: "Live on the public site.",
                      },
                      {
                        value: "archived",
                        label: "Archived",
                        description: "Off-catalog, kept for history.",
                      },
                    ]}
                  />
                </Field>
              </Card>

              <Card title="Homepage curation">
                <div className="space-y-3">
                  <Switch
                    checked={state.isFeatured}
                    onChange={(v) =>
                      setState({ ...state, isFeatured: v })
                    }
                    label="Featured on homepage"
                    description="Eligible for the curated 'New releases' lineup. The homepage editor still has to pick it."
                  />
                  <Switch
                    checked={state.isNewRelease}
                    onChange={(v) =>
                      setState({ ...state, isNewRelease: v })
                    }
                    label="New release"
                    description="Adds a 'NEW' badge on cards across the site."
                  />
                  <Switch
                    checked={state.priceOnEnquiry}
                    onChange={(v) =>
                      setState({ ...state, priceOnEnquiry: v })
                    }
                    label="Price on enquiry"
                    description="Hides the price publicly. Visitors see ‘Price on enquiry’ and the WhatsApp CTA."
                  />
                  <FieldGrid cols={2}>
                    <Field label="Manual order">
                      <NumberInput
                        value={state.position}
                        onChange={(v) =>
                          setState({ ...state, position: v ?? 0 })
                        }
                        min={0}
                      />
                    </Field>
                  </FieldGrid>
                </div>
              </Card>
            </TabPanel>

            <TabPanel value="seo">
              <Card title="Search & social">
                <SeoPanel
                  state={state.seo}
                  onChange={(seo) => setState({ ...state, seo })}
                  pathPrefix="/products"
                  slug={state.slug}
                  fallbackTitle={state.name}
                  fallbackDescription={state.description.slice(0, 160)}
                />
              </Card>
            </TabPanel>
          </Tabs>
        </div>

        {/* right column — live preview */}
        <aside className="hidden space-y-4 lg:block">
          <div className="sticky top-20 space-y-4">
            <Card title="Live preview">
              <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-base)]">
                {state.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.thumbnailUrl}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center text-xs opacity-50">
                    No thumbnail
                  </div>
                )}
                <div className="p-3">
                  <div className="font-display text-sm">
                    {state.name || "Untitled"}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2 text-xs">
                    <span className="text-[var(--color-gold)]">
                      {state.currency} {state.price.toLocaleString()}
                    </span>
                    {state.compareAtPrice && (
                      <span className="opacity-50 line-through">
                        {state.currency}{" "}
                        {state.compareAtPrice.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {state.isFeatured && <Badge tone="gold">★ Featured</Badge>}
                {state.isNewRelease && <Badge tone="success">NEW</Badge>}
                <Badge
                  tone={state.status === "published" ? "success" : "muted"}
                >
                  {state.status}
                </Badge>
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
