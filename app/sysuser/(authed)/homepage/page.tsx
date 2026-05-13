"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Field, TextInput } from "@/components/sysuser/form";
import { ProductPicker } from "@/components/sysuser/product-picker";
import { ImageUploader } from "@/components/sysuser/image-uploader";
import { CurationPicker } from "@/components/sysuser/curation-picker";
import { Accordion, AccordionItem } from "@/components/ui/accordion";

interface HomepageState {
  heroImage: string;
  heroVideoEmbedUrl: string;
  newReleasesProductIds: string[];
  featuredPostIds: string[];
  elementSpotlightProductIds: Record<string, string[]>;
  servicesPreviewSlugs: string[];
}

interface PostRow {
  id: string;
  title: string;
  slug: string;
  isFeatured: boolean;
}

interface ServiceRow {
  slug: string;
  name: string;
}

const ELEMENTS = ["metal", "earth", "wood", "plant", "water", "air"] as const;

function CurationStatus({
  count,
  fallback,
  curated,
}: {
  count: number;
  fallback: string;
  curated: string;
}) {
  if (count > 0) {
    return (
      <div className="rounded border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-3 py-2 text-xs">
        ✓ {count} picked. {curated}
      </div>
    );
  }
  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-xs opacity-80">
      ⓘ Nothing picked. {fallback}
    </div>
  );
}

export default function HomepageCurationPage() {
  const [state, setState] = useState<HomepageState | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/sysuser/homepage").then((r) => r.json()),
      fetch("/api/sysuser/blog/posts").then((r) => r.json()),
      fetch("/api/sysuser/services").then((r) => r.json()),
    ]).then(([h, p, s]) => {
      const data = h.homepage ?? {};
      setState({
        heroImage: data.heroImage ?? "",
        heroVideoEmbedUrl: data.heroVideoEmbedUrl ?? "",
        newReleasesProductIds: data.newReleasesProductIds ?? [],
        featuredPostIds: data.featuredPostIds ?? [],
        elementSpotlightProductIds: data.elementSpotlightProductIds ?? {},
        servicesPreviewSlugs: data.servicesPreviewSlugs ?? [],
      });
      setPosts(p.posts ?? []);
      setServices(s.services ?? []);
    });
  }, []);

  if (!state) return <div className="opacity-60">Loading…</div>;

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/sysuser/homepage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        heroImage: state.heroImage || null,
        heroVideoEmbedUrl: state.heroVideoEmbedUrl || null,
        newReleasesProductIds: state.newReleasesProductIds,
        featuredPostIds: state.featuredPostIds,
        elementSpotlightProductIds: state.elementSpotlightProductIds,
        servicesPreviewSlugs: state.servicesPreviewSlugs,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(j?.message ?? "Save failed");
    }
  };

  const postCurationItems = posts.map((p) => ({
    id: p.id,
    label: p.title,
    hint: p.slug,
  }));

  const serviceCurationItems = services.map((s) => ({
    id: s.slug,
    label: s.name,
    hint: s.slug,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Homepage curation</h1>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {error && (
        <div className="rounded bg-[var(--color-danger)]/20 p-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <section className="space-y-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="font-display text-xl">Hero</h2>
        <Field label="Hero image">
          <div className="flex gap-2">
            <TextInput
              value={state.heroImage}
              onChange={(e) =>
                setState({ ...state, heroImage: e.target.value })
              }
            />
            <ImageUploader
              onUploaded={(url) => setState({ ...state, heroImage: url })}
            />
          </div>
        </Field>
        <Field label="Hero video (YouTube/Vimeo)" hint="Plays inline if set, replaces hero image.">
          <TextInput
            value={state.heroVideoEmbedUrl}
            onChange={(e) =>
              setState({ ...state, heroVideoEmbedUrl: e.target.value })
            }
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </Field>
      </section>

      <section className="space-y-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="font-display text-xl">New releases</h2>
        <p className="text-xs opacity-60">
          Tick the products to feature in the home grid. Order by ↑/↓.
        </p>
        <CurationStatus
          count={state.newReleasesProductIds.length}
          fallback="Auto-fallback: showing the 8 newest published products."
          curated="Showing your curated picks on the live home page."
        />
        <ProductPicker
          selectedIds={state.newReleasesProductIds}
          onChange={(ids) =>
            setState({ ...state, newReleasesProductIds: ids })
          }
        />
      </section>

      <section className="space-y-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="font-display text-xl">Featured stories</h2>
        <p className="text-xs opacity-60">
          Tick the blog posts to show on the home page (newest pinned first).
        </p>
        <CurationStatus
          count={state.featuredPostIds.length}
          fallback="Auto-fallback: showing the 4 newest published posts."
          curated="Showing your curated picks on the live home page."
        />
        {posts.length === 0 && (
          <p className="text-xs text-[var(--color-danger)] opacity-80">
            No blog posts in the database yet. Add posts under{" "}
            <Link href="/sysuser/blog" className="underline">/sysuser/blog</Link>.
          </p>
        )}
        {posts.length > 0 && (
          <CurationPicker
            items={postCurationItems}
            selectedIds={state.featuredPostIds}
            onChange={(ids) =>
              setState({ ...state, featuredPostIds: ids })
            }
            searchPlaceholder="Search posts by title or slug…"
          />
        )}
      </section>

      <section className="space-y-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="font-display text-xl">Element spotlights</h2>
        <p className="text-xs opacity-60">
          Pick a few products per element. They render in the &ldquo;Spotlight&rdquo; strip
          above the main grid on each element page (e.g. /nature/metal).
        </p>
        <Accordion defaultOpenKey={null}>
          {ELEMENTS.map((el) => (
            <AccordionItem
              key={el}
              itemKey={el}
              title={<span className="capitalize">{el}</span>}
              subtitle={`${state.elementSpotlightProductIds[el]?.length ?? 0} picked`}
            >
              <ProductPicker
                defaultElement={el}
                selectedIds={state.elementSpotlightProductIds[el] ?? []}
                onChange={(ids) =>
                  setState({
                    ...state,
                    elementSpotlightProductIds: {
                      ...state.elementSpotlightProductIds,
                      [el]: ids,
                    },
                  })
                }
              />
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="space-y-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="font-display text-xl">Services preview</h2>
        <CurationStatus
          count={state.servicesPreviewSlugs.length}
          fallback="Auto-fallback: showing the first 3 services by position."
          curated="Showing your curated picks on the live home page."
        />
        {services.length === 0 && (
          <p className="text-xs text-[var(--color-danger)] opacity-80">
            No services in the database yet. Add services under{" "}
            <Link href="/sysuser/services" className="underline">/sysuser/services</Link>.
          </p>
        )}
        {services.length > 0 && (
          <CurationPicker
            items={serviceCurationItems}
            selectedIds={state.servicesPreviewSlugs}
            onChange={(ids) =>
              setState({ ...state, servicesPreviewSlugs: ids })
            }
            searchPlaceholder="Search services by name or slug…"
          />
        )}
      </section>
    </div>
  );
}
