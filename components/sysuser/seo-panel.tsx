"use client";

// Per-entity SEO editor with live SERP + OG previews and counters.
// Used inside Page / BlogPost / Product / Bundle / Collection / Service editors.

import { Field, TextInput, Textarea } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { RadioGroup } from "@/components/ui/radio-group";
import { Section } from "@/components/ui/section";
import { ImageUploader } from "@/components/sysuser/image-uploader";

export interface SeoState {
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  canonicalUrl: string;
  noindex: boolean;
  twitterCard: "summary" | "summary_large_image";
}

export const emptySeo = (): SeoState => ({
  seoTitle: "",
  seoDescription: "",
  ogImageUrl: "",
  canonicalUrl: "",
  noindex: false,
  twitterCard: "summary_large_image",
});

const PUBLIC_BASE = "https://shamankathmandu.com";

function tone(len: number, ideal: [number, number]): string {
  if (len === 0) return "opacity-50";
  if (len < ideal[0]) return "text-[var(--color-gold)]";
  if (len <= ideal[1]) return "text-[var(--color-success)]";
  return "text-[var(--color-danger)]";
}

export function SeoPanel({
  state,
  onChange,
  pathPrefix,
  slug,
  fallbackTitle,
  fallbackDescription,
}: {
  state: SeoState;
  onChange: (next: SeoState) => void;
  /** e.g. "/products" — used to render the live URL chip. */
  pathPrefix: string;
  slug: string;
  fallbackTitle: string;
  fallbackDescription: string;
}) {
  const set = <K extends keyof SeoState>(key: K, value: SeoState[K]) =>
    onChange({ ...state, [key]: value });

  const url = `${PUBLIC_BASE}${pathPrefix}/${slug || "<slug>"}`;
  const titleForPreview = state.seoTitle || fallbackTitle;
  const descForPreview = state.seoDescription || fallbackDescription;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <Field
          label="SEO title"
          hint={`${state.seoTitle.length} / 60 chars · ${state.seoTitle.length === 0 ? "Falls back to entity title." : ""}`}
        >
          <TextInput
            value={state.seoTitle}
            onChange={(e) => set("seoTitle", e.target.value)}
            placeholder={fallbackTitle}
          />
          <div className={`mt-1 text-[10px] ${tone(state.seoTitle.length, [40, 60])}`}>
            Target: 40–60 chars
          </div>
        </Field>

        <Field
          label="SEO description"
          hint={`${state.seoDescription.length} / 160 chars`}
        >
          <Textarea
            rows={3}
            value={state.seoDescription}
            onChange={(e) => set("seoDescription", e.target.value)}
            placeholder={fallbackDescription}
          />
          <div className={`mt-1 text-[10px] ${tone(state.seoDescription.length, [120, 160])}`}>
            Target: 120–160 chars
          </div>
        </Field>

        <Field
          label="Social / OG image"
          hint="Used by Facebook, Twitter, LinkedIn, WhatsApp link previews."
        >
          <div className="flex items-center gap-2">
            <TextInput
              value={state.ogImageUrl}
              onChange={(e) => set("ogImageUrl", e.target.value)}
              placeholder="https://media.…"
            />
            <ImageUploader
              onUploaded={(url) => set("ogImageUrl", url)}
              label="Upload"
            />
          </div>
        </Field>

        <Field
          label="Twitter card"
          hint="Layout used when this page is shared on Twitter / X."
        >
          <RadioGroup
            value={state.twitterCard}
            onChange={(v) => set("twitterCard", v)}
            options={[
              { value: "summary", label: "Summary (small)" },
              { value: "summary_large_image", label: "Large image" },
            ]}
            variant="segmented"
          />
        </Field>

        <Field
          label="Canonical URL"
          hint="Optional. Set when this page is a copy of another canonical source."
        >
          <TextInput
            value={state.canonicalUrl}
            onChange={(e) => set("canonicalUrl", e.target.value)}
            placeholder={url}
          />
        </Field>

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] p-4">
          <Switch
            checked={state.noindex}
            onChange={(v) => set("noindex", v)}
            label="Hide from search engines"
            description="Adds <meta name=&quot;robots&quot; content=&quot;noindex&quot;>."
          />
        </div>
      </div>

      <aside className="space-y-4">
        <Section eyebrow="Live preview" title="Google result">
          <div className="rounded-lg border border-[var(--color-border)] bg-white p-4 text-black">
            <div className="text-xs text-[#202124]">
              {url
                .replace(/^https?:\/\//, "")
                .split("/")
                .map((p, i, arr) => (
                  <span key={i}>
                    {i > 0 && (
                      <span className="mx-1 text-[#5f6368]">›</span>
                    )}
                    {p}
                    {i === arr.length - 1 ? "" : ""}
                  </span>
                ))}
            </div>
            <div className="mt-1 line-clamp-1 text-[18px] leading-snug text-[#1a0dab]">
              {titleForPreview || "Untitled"}
            </div>
            <div className="mt-1 line-clamp-2 text-[13px] text-[#4d5156]">
              {descForPreview || "—"}
            </div>
          </div>
        </Section>

        <Section eyebrow="Live preview" title="Social card">
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-base)]">
            {state.ogImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.ogImageUrl}
                alt=""
                className="aspect-[1.91/1] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[1.91/1] w-full items-center justify-center bg-[var(--color-surface)] text-xs opacity-50">
                No social image set
              </div>
            )}
            <div className="p-3">
              <div className="text-[10px] uppercase tracking-wider opacity-50">
                shamankathmandu.com
              </div>
              <div className="mt-0.5 line-clamp-2 text-sm font-medium">
                {titleForPreview || "Untitled"}
              </div>
              <div className="mt-1 line-clamp-2 text-xs opacity-60">
                {descForPreview || "—"}
              </div>
            </div>
          </div>
        </Section>
      </aside>
    </div>
  );
}
