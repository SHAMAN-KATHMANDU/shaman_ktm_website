"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Field, TextInput } from "@/components/sysuser/form";
import { ProductPicker } from "@/components/sysuser/product-picker";
import { ImageUploader } from "@/components/sysuser/image-uploader";
import { CurationPicker } from "@/components/sysuser/curation-picker";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import {
  HOME_ACCENTS,
  ACCENT_COLOR,
  ACCENT_LABEL,
  type HomeAccent,
} from "@/lib/home-accents";

const ACCENT_SECTIONS: { key: AccentSection; label: string; fallback: HomeAccent }[] = [
  { key: "offers", label: "Offers grid", fallback: "gold" },
  { key: "campaign", label: "Campaign rail", fallback: "green" },
  { key: "clearance", label: "Clearance", fallback: "clay" },
  { key: "trust", label: "Trust band (band colour)", fallback: "gold" },
  { key: "who", label: "Who we are", fallback: "gold" },
  { key: "memberCircle", label: "Member Circle", fallback: "gold" },
];

type AccentSection =
  | "offers"
  | "campaign"
  | "clearance"
  | "trust"
  | "who"
  | "memberCircle";

interface OfferCard {
  type: "collection" | "text";
  collectionSlug: string;
  chipLabel: string;
  heading: string;
  blurb: string;
  ctaLabel: string;
  ctaHref: string;
  imageUrl: string;
}

interface CampaignRail {
  collectionSlug: string;
  badgeLabel: string;
  memberDiscountPercent: number;
}

interface ClearanceConfig {
  collectionSlug: string;
  percentLabel: string;
  badgeLabel: string;
}

interface HomepageState {
  heroImage: string;
  heroVideoEmbedUrl: string;
  newReleasesProductIds: string[];
  featuredPostIds: string[];
  elementSpotlightProductIds: Record<string, string[]>;
  servicesPreviewSlugs: string[];
  offersCards: OfferCard[];
  campaignEnabled: boolean;
  campaignRail: CampaignRail;
  clearanceEnabled: boolean;
  clearance: ClearanceConfig;
  sectionAccents: Record<AccentSection, HomeAccent>;
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

interface CollectionRow {
  id: string;
  slug: string;
  title: string;
}

const EMPTY_OFFER: OfferCard = {
  type: "collection",
  collectionSlug: "",
  chipLabel: "",
  heading: "",
  blurb: "",
  ctaLabel: "",
  ctaHref: "",
  imageUrl: "",
};

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
  const [collections, setCollections] = useState<CollectionRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/sysuser/homepage").then((r) => r.json()),
      fetch("/api/sysuser/blog/posts").then((r) => r.json()),
      fetch("/api/sysuser/services").then((r) => r.json()),
      fetch("/api/sysuser/collections").then((r) => r.json()),
    ]).then(([h, p, s, c]) => {
      const data = h.homepage ?? {};
      setState({
        heroImage: data.heroImage ?? "",
        heroVideoEmbedUrl: data.heroVideoEmbedUrl ?? "",
        newReleasesProductIds: data.newReleasesProductIds ?? [],
        featuredPostIds: data.featuredPostIds ?? [],
        elementSpotlightProductIds: data.elementSpotlightProductIds ?? {},
        servicesPreviewSlugs: data.servicesPreviewSlugs ?? [],
        offersCards: (data.offersCards ?? []).map((o: Partial<OfferCard>) => ({
          ...EMPTY_OFFER,
          ...o,
          collectionSlug: o.collectionSlug ?? "",
          chipLabel: o.chipLabel ?? "",
          imageUrl: o.imageUrl ?? "",
        })),
        campaignEnabled: !!data.campaignRail,
        campaignRail: {
          collectionSlug: data.campaignRail?.collectionSlug ?? "",
          badgeLabel: data.campaignRail?.badgeLabel ?? "",
          memberDiscountPercent:
            data.campaignRail?.memberDiscountPercent ?? 0,
        },
        clearanceEnabled: !!data.clearance,
        clearance: {
          collectionSlug: data.clearance?.collectionSlug ?? "",
          percentLabel: data.clearance?.percentLabel ?? "",
          badgeLabel: data.clearance?.badgeLabel ?? "",
        },
        sectionAccents: ACCENT_SECTIONS.reduce(
          (acc, s) => {
            acc[s.key] = data.sectionAccents?.[s.key] ?? s.fallback;
            return acc;
          },
          {} as Record<AccentSection, HomeAccent>,
        ),
      });
      setPosts(p.posts ?? []);
      setServices(s.services ?? []);
      setCollections(c.collections ?? []);
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
        offersCards: state.offersCards.map((o) => ({
          ...o,
          collectionSlug: o.collectionSlug || null,
          chipLabel: o.chipLabel || null,
          imageUrl: o.imageUrl || null,
        })),
        campaignRail:
          state.campaignEnabled && state.campaignRail.collectionSlug
            ? state.campaignRail
            : null,
        clearance:
          state.clearanceEnabled && state.clearance.collectionSlug
            ? state.clearance
            : null,
        sectionAccents: state.sectionAccents,
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
        <h2 className="font-display text-xl">Offers grid</h2>
        <p className="text-xs opacity-60">
          Cards in the &ldquo;offers&rdquo; band (homeOffers module). Collection
          cards link a collection; text cards are pure promo copy (e.g. a
          Member Circle teaser). Section copy is edited in Brand &amp; SEO →
          Home copy.
        </p>
        <div className="space-y-4">
          {state.offersCards.map((card, i) => (
            <div
              key={i}
              className="space-y-3 rounded border border-[var(--color-border)] bg-[var(--color-base)] p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs uppercase tracking-wider opacity-60">
                  Card {i + 1}
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const next = [...state.offersCards];
                      if (i > 0) {
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        setState({ ...state, offersCards: next });
                      }
                    }}
                  >
                    ↑
                  </Button>
                  <Button
                    onClick={() =>
                      setState({
                        ...state,
                        offersCards: state.offersCards.filter(
                          (_, j) => j !== i,
                        ),
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Type">
                  <select
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm"
                    value={card.type}
                    onChange={(e) =>
                      setState({
                        ...state,
                        offersCards: state.offersCards.map((c, j) =>
                          j === i
                            ? { ...c, type: e.target.value as OfferCard["type"] }
                            : c,
                        ),
                      })
                    }
                  >
                    <option value="collection">Collection</option>
                    <option value="text">Text only</option>
                  </select>
                </Field>
                {card.type === "collection" && (
                  <Field label="Collection">
                    <select
                      className="w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm"
                      value={card.collectionSlug}
                      onChange={(e) =>
                        setState({
                          ...state,
                          offersCards: state.offersCards.map((c, j) =>
                            j === i
                              ? { ...c, collectionSlug: e.target.value }
                              : c,
                          ),
                        })
                      }
                    >
                      <option value="">— pick a collection —</option>
                      {collections.map((c) => (
                        <option key={c.slug} value={c.slug}>
                          {c.title} ({c.slug})
                        </option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Chip label" hint='e.g. "All access · Shrawan only" or "Members only"'>
                  <TextInput
                    value={card.chipLabel}
                    onChange={(e) =>
                      setState({
                        ...state,
                        offersCards: state.offersCards.map((c, j) =>
                          j === i ? { ...c, chipLabel: e.target.value } : c,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="Heading">
                  <TextInput
                    value={card.heading}
                    onChange={(e) =>
                      setState({
                        ...state,
                        offersCards: state.offersCards.map((c, j) =>
                          j === i ? { ...c, heading: e.target.value } : c,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="Blurb">
                  <TextInput
                    value={card.blurb}
                    onChange={(e) =>
                      setState({
                        ...state,
                        offersCards: state.offersCards.map((c, j) =>
                          j === i ? { ...c, blurb: e.target.value } : c,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="CTA label">
                  <TextInput
                    value={card.ctaLabel}
                    onChange={(e) =>
                      setState({
                        ...state,
                        offersCards: state.offersCards.map((c, j) =>
                          j === i ? { ...c, ctaLabel: e.target.value } : c,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="CTA link" hint="e.g. /collections/shrawan-jewelry or #member-circle">
                  <TextInput
                    value={card.ctaHref}
                    onChange={(e) =>
                      setState({
                        ...state,
                        offersCards: state.offersCards.map((c, j) =>
                          j === i ? { ...c, ctaHref: e.target.value } : c,
                        ),
                      })
                    }
                  />
                </Field>
                <Field label="Image override">
                  <div className="flex gap-2">
                    <TextInput
                      value={card.imageUrl}
                      onChange={(e) =>
                        setState({
                          ...state,
                          offersCards: state.offersCards.map((c, j) =>
                            j === i ? { ...c, imageUrl: e.target.value } : c,
                          ),
                        })
                      }
                    />
                    <ImageUploader
                      onUploaded={(url) =>
                        setState({
                          ...state,
                          offersCards: state.offersCards.map((c, j) =>
                            j === i ? { ...c, imageUrl: url } : c,
                          ),
                        })
                      }
                    />
                  </div>
                </Field>
              </div>
            </div>
          ))}
          <Button
            onClick={() =>
              setState({
                ...state,
                offersCards: [...state.offersCards, { ...EMPTY_OFFER }],
              })
            }
          >
            + Add offer card
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="font-display text-xl">Campaign rail</h2>
        <p className="text-xs opacity-60">
          Seasonal product rail (homeCampaignRail module) — e.g. Shrawan
          jewelry. Products come from the collection; offer price = product
          price with compareAtPrice struck through; member price is computed
          from the % below.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.campaignEnabled}
            onChange={(e) =>
              setState({ ...state, campaignEnabled: e.target.checked })
            }
          />
          Configure campaign rail
        </label>
        {state.campaignEnabled && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Collection">
              <select
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm"
                value={state.campaignRail.collectionSlug}
                onChange={(e) =>
                  setState({
                    ...state,
                    campaignRail: {
                      ...state.campaignRail,
                      collectionSlug: e.target.value,
                    },
                  })
                }
              >
                <option value="">— pick a collection —</option>
                {collections.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title} ({c.slug})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Badge label" hint='e.g. "−10% Shrawan"'>
              <TextInput
                value={state.campaignRail.badgeLabel}
                onChange={(e) =>
                  setState({
                    ...state,
                    campaignRail: {
                      ...state.campaignRail,
                      badgeLabel: e.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field
              label="Member discount %"
              hint="Extra % off the offer price shown as the member price. 0 hides the member line."
            >
              <TextInput
                type="number"
                min={0}
                max={90}
                value={String(state.campaignRail.memberDiscountPercent)}
                onChange={(e) =>
                  setState({
                    ...state,
                    campaignRail: {
                      ...state.campaignRail,
                      memberDiscountPercent: Math.max(
                        0,
                        Math.min(90, parseInt(e.target.value, 10) || 0),
                      ),
                    },
                  })
                }
              />
            </Field>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="font-display text-xl">Clearance</h2>
        <p className="text-xs opacity-60">
          Final-sale section (homeClearance module). Products come from the
          collection; banner copy is edited in Brand &amp; SEO → Home copy.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={state.clearanceEnabled}
            onChange={(e) =>
              setState({ ...state, clearanceEnabled: e.target.checked })
            }
          />
          Configure clearance
        </label>
        {state.clearanceEnabled && (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Collection">
              <select
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm"
                value={state.clearance.collectionSlug}
                onChange={(e) =>
                  setState({
                    ...state,
                    clearance: {
                      ...state.clearance,
                      collectionSlug: e.target.value,
                    },
                  })
                }
              >
                <option value="">— pick a collection —</option>
                {collections.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title} ({c.slug})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Percent label" hint='Big banner number, e.g. "40%"'>
              <TextInput
                value={state.clearance.percentLabel}
                onChange={(e) =>
                  setState({
                    ...state,
                    clearance: {
                      ...state.clearance,
                      percentLabel: e.target.value,
                    },
                  })
                }
              />
            </Field>
            <Field label="Badge label" hint='e.g. "Final sale −40%"'>
              <TextInput
                value={state.clearance.badgeLabel}
                onChange={(e) =>
                  setState({
                    ...state,
                    clearance: {
                      ...state.clearance,
                      badgeLabel: e.target.value,
                    },
                  })
                }
              />
            </Field>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <h2 className="font-display text-xl">Section accents</h2>
        <p className="text-xs opacity-60">
          Editorial accent colour for each section — the eyebrow, badge, and
          highlight (for the Trust band it&apos;s the whole band colour). Pick
          from the curated palette so every section stays on-brand.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {ACCENT_SECTIONS.map((sec) => (
            <Field key={sec.key} label={sec.label}>
              <div className="flex items-center gap-3">
                <span
                  className="inline-block h-6 w-6 rounded-full border border-[var(--color-border)] flex-shrink-0"
                  style={{ backgroundColor: ACCENT_COLOR[state.sectionAccents[sec.key]] }}
                  aria-hidden
                />
                <select
                  className="w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm"
                  value={state.sectionAccents[sec.key]}
                  onChange={(e) =>
                    setState({
                      ...state,
                      sectionAccents: {
                        ...state.sectionAccents,
                        [sec.key]: e.target.value as HomeAccent,
                      },
                    })
                  }
                >
                  {HOME_ACCENTS.map((a) => (
                    <option key={a} value={a}>
                      {ACCENT_LABEL[a]}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          ))}
        </div>
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
