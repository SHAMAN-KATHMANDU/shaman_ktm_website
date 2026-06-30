"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Field,
  Select,
  TextInput,
  Textarea,
} from "@/components/sysuser/form";
import { SeoPanel, type SeoState } from "@/components/sysuser/seo-panel";
import { BilingualField } from "@/components/sysuser/bilingual-field";

interface State {
  slug: string;
  name: string;
  nameNe: string | null;
  element: "metal" | "earth" | "wood" | "plant" | "water" | "air";
  duration: string;
  durationNe: string | null;
  pricePerSession: number;
  hero: string;
  summary: string;
  summaryNe: string | null;
  whatToExpect: string;
  relatedProductSlugs: string;
  position: number;
  seo: SeoState;
}

export default function ServiceEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sysuser/services")
      .then((r) => r.json())
      .then((j) => {
        const s = (j.services as Array<State & Record<string, unknown>>).find(
          (x) => x.slug === slug,
        );
        if (s) {
          setState({
            slug: s.slug,
            name: s.name,
            nameNe: (s.nameNe as string | null) ?? null,
            element: s.element,
            duration: s.duration,
            durationNe: (s.durationNe as string | null) ?? null,
            pricePerSession: s.pricePerSession,
            hero: (s.hero as string) ?? "",
            summary: s.summary,
            summaryNe: (s.summaryNe as string | null) ?? null,
            whatToExpect: ((s.whatToExpect as unknown as string[]) ?? []).join("\n"),
            relatedProductSlugs: (
              (s.relatedProductSlugs as unknown as string[]) ?? []
            ).join(", "),
            position: (s.position as number) ?? 0,
            seo: {
              seoTitle: (s.seoTitle as string) ?? "",
              seoDescription: (s.seoDescription as string) ?? "",
              ogImageUrl: (s.ogImageUrl as string) ?? "",
              canonicalUrl: (s.canonicalUrl as string) ?? "",
              noindex: !!(s.noindex as boolean),
              twitterCard:
                ((s.twitterCard as SeoState["twitterCard"]) ??
                  "summary_large_image"),
            },
          });
        }
      });
  }, [slug]);

  if (!state) return <div className="opacity-60">Loading…</div>;

  const save = async () => {
    setError(null);
    const res = await fetch(`/api/sysuser/services/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: state.slug,
        name: state.name,
        nameNe: state.nameNe || null,
        element: state.element,
        duration: state.duration,
        durationNe: state.durationNe || null,
        pricePerSession: state.pricePerSession,
        hero: state.hero || null,
        summary: state.summary,
        summaryNe: state.summaryNe || null,
        whatToExpect: state.whatToExpect
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        relatedProductSlugs: state.relatedProductSlugs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        position: state.position,
        seoTitle: state.seo.seoTitle || null,
        seoDescription: state.seo.seoDescription || null,
        ogImageUrl: state.seo.ogImageUrl || null,
        canonicalUrl: state.seo.canonicalUrl || null,
        noindex: state.seo.noindex,
        twitterCard: state.seo.twitterCard,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(j?.message ?? "Save failed");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this service?")) return;
    await fetch(`/api/sysuser/services/${slug}`, { method: "DELETE" });
    router.push("/sysuser/services");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl">Edit service</h1>
        <div className="flex gap-2">
          <Button variant="danger" onClick={remove}>
            Delete
          </Button>
          <Button onClick={save}>Save</Button>
        </div>
      </div>
      {error && (
        <div className="rounded bg-[var(--color-danger)]/20 p-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <BilingualField
          label="Name"
          enValue={state.name}
          neValue={state.nameNe}
          onEnChange={(v) => setState({ ...state, name: v })}
          onNeChange={(v) => setState({ ...state, nameNe: v })}
        />
        <Field label="Element">
          <Select
            value={state.element}
            onChange={(e) =>
              setState({
                ...state,
                element: e.target.value as State["element"],
              })
            }
          >
            {["metal", "earth", "wood", "plant", "water", "air"].map((el) => (
              <option key={el} value={el}>
                {el}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <BilingualField
          label="Duration"
          enValue={state.duration}
          neValue={state.durationNe}
          onEnChange={(v) => setState({ ...state, duration: v })}
          onNeChange={(v) => setState({ ...state, durationNe: v })}
        />
        <Field label="Price per session (NPR)">
          <TextInput
            type="number"
            value={state.pricePerSession}
            onChange={(e) =>
              setState({
                ...state,
                pricePerSession: Number(e.target.value) || 0,
              })
            }
          />
        </Field>
      </div>
      <Field label="Hero image URL">
        <TextInput
          value={state.hero}
          onChange={(e) => setState({ ...state, hero: e.target.value })}
        />
      </Field>
      <BilingualField
        label="Summary"
        enValue={state.summary}
        neValue={state.summaryNe}
        onEnChange={(v) => setState({ ...state, summary: v })}
        onNeChange={(v) => setState({ ...state, summaryNe: v })}
        multiline
      />
      <Field label="What to expect" hint="One bullet per line.">
        <Textarea
          rows={5}
          value={state.whatToExpect}
          onChange={(e) =>
            setState({ ...state, whatToExpect: e.target.value })
          }
        />
      </Field>
      <Field label="Related product slugs" hint="Comma-separated.">
        <TextInput
          value={state.relatedProductSlugs}
          onChange={(e) =>
            setState({ ...state, relatedProductSlugs: e.target.value })
          }
        />
      </Field>
      <div>
        <h2 className="font-display text-2xl mb-3">SEO &amp; Social</h2>
        <SeoPanel
          state={state.seo}
          onChange={(seo) => setState({ ...state, seo })}
          pathPrefix="/energy"
          slug={state.slug}
          fallbackTitle={state.name}
          fallbackDescription={state.summary}
        />
      </div>
    </div>
  );
}
