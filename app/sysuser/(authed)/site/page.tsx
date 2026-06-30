"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { FieldGrid } from "@/components/ui/section";
import { Field, TextInput, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/tabs";
import { ColorPicker } from "@/components/ui/color-picker";
import { StickySaveBar } from "@/components/ui/sticky-save-bar";
import { ImageUploader } from "@/components/sysuser/image-uploader";
import { useUnsavedGuard } from "@/components/sysuser/use-unsaved-guard";
import { useToast } from "@/components/ui/toast";
import {
  NavEditor,
  DEFAULT_NAV,
  type NavConfig,
} from "@/components/sysuser/nav-editor";
import { BilingualField } from "@/components/sysuser/bilingual-field";
import type { SiteConfig } from "@/lib/api/types";

interface BrandStripCard {
  title: string;
  body: string;
}

interface HomeCopy {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroEyebrowNe: string;
  heroTitleNe: string;
  heroSubtitleNe: string;
  heroCtaLabel: string;
  heroCtaLabelNe: string;
  heroCtaHref: string;
  brandStripLines: string[];
  brandStripCards: BrandStripCard[];
  elementsHeading: string;
  elementsHeadingNe: string;
  elementsSubheading: string;
  elementsSubheadingNe: string;
  categoriesEyebrow: string;
  categoriesEyebrowNe: string;
  categoriesHeading: string;
  categoriesHeadingNe: string;
  categoriesSubheading: string;
  categoriesSubheadingNe: string;
  newReleasesEyebrow: string;
  newReleasesEyebrowNe: string;
  newReleasesHeading: string;
  newReleasesHeadingNe: string;
  newReleasesSubheading: string;
  newReleasesSubheadingNe: string;
  featuredStoryEyebrow: string;
  featuredStoryEyebrowNe: string;
  featuredStoryHeading: string;
  featuredStoryHeadingNe: string;
  featuredStorySubheading: string;
  featuredStorySubheadingNe: string;
  servicesEyebrow: string;
  servicesEyebrowNe: string;
  servicesHeading: string;
  servicesHeadingNe: string;
  servicesSubheading: string;
  servicesSubheadingNe: string;
  footerTagline: string;
  footerTaglineNe: string;
  footerCopyright: string;
  footerCopyrightNe: string;
  newsletterHeading: string;
  newsletterHeadingNe: string;
  newsletterDescription: string;
  newsletterDescriptionNe: string;
  naturePageEyebrow: string;
  naturePageEyebrowNe: string;
  naturePageHeading: string;
  naturePageHeadingNe: string;
  naturePageSubheading: string;
  naturePageSubheadingNe: string;
  energyPageEyebrow: string;
  energyPageEyebrowNe: string;
  energyPageHeading: string;
  energyPageHeadingNe: string;
  energyPageSubheading: string;
  energyPageSubheadingNe: string;
  energyPageEmptyState: string;
  energyPageEmptyStateNe: string;
  storiesPageEyebrow: string;
  storiesPageEyebrowNe: string;
  storiesPageHeading: string;
  storiesPageHeadingNe: string;
  storiesPageSubheading: string;
  storiesPageSubheadingNe: string;
  storiesPageNepaliCouplet: string;
  contactHeading: string;
  contactHeadingNe: string;
  contactSubheading: string;
  contactSubheadingNe: string;
  contactResponseNote: string;
  contactResponseNoteNe: string;
}

interface ExtendedSite extends SiteConfig {
  branding: SiteConfig["branding"] & { faviconUrl?: string };
  homeCopy?: Partial<HomeCopy>;
  nav?: Partial<NavConfig>;
}

const DEFAULT_HOME_COPY: HomeCopy = {
  heroEyebrow: "Curated in Kathmandu",
  heroTitle: "Nature + Energy",
  heroSubtitle:
    "Hand-curated objects and services around six elements — Metal, Earth, Wood, Plant, Water, Air.",
  heroEyebrowNe: "",
  heroTitleNe: "",
  heroSubtitleNe: "",
  heroCtaLabel: "Explore the elements",
  heroCtaLabelNe: "",
  heroCtaHref: "/nature",
  brandStripLines: ["Curated in Kathmandu", "From the world", "For the world"],
  brandStripCards: [
    {
      title: "Our Lens, Not Our Limit",
      body: "We curate beyond Nepal — sourcing the right object from the right place, regardless of border.",
    },
    {
      title: "Sourced Globally. Served Globally.",
      body: "Four showrooms in Kathmandu. WhatsApp delivery anywhere a parcel can travel.",
    },
    {
      title: "Rooted in Respect",
      body: "Short chains, fair prices, and the patience that good objects deserve.",
    },
  ],
  elementsHeading: "The six elements",
  elementsHeadingNe: "",
  elementsSubheading: "Everything in nature carries energy.",
  elementsSubheadingNe: "",
  categoriesEyebrow: "Browse Categories",
  categoriesEyebrowNe: "",
  categoriesHeading: "Shop by category",
  categoriesHeadingNe: "",
  categoriesSubheading: "",
  categoriesSubheadingNe: "",
  newReleasesEyebrow: "New Releases",
  newReleasesEyebrowNe: "",
  newReleasesHeading: "Newly arrived this season",
  newReleasesHeadingNe: "",
  newReleasesSubheading: "",
  newReleasesSubheadingNe: "",
  featuredStoryEyebrow: "Shaman Stories",
  featuredStoryEyebrowNe: "",
  featuredStoryHeading: "The latest stories",
  featuredStoryHeadingNe: "",
  featuredStorySubheading:
    "A journey by Shaman Kathmandu into the elements, the unseen forces, and the wisdom of nature.",
  featuredStorySubheadingNe: "",
  servicesEyebrow: "Energy Services",
  servicesEyebrowNe: "",
  servicesHeading: "Sit, breathe, be sound",
  servicesHeadingNe: "",
  servicesSubheading:
    "Sound healing, breath work, and slow guided practice — at our showrooms or above the city in the pine.",
  servicesSubheadingNe: "",
  footerTagline:
    "Curated in Kathmandu. From the world. For the world. Four showrooms across the valley.",
  footerTaglineNe: "",
  footerCopyright: "Shaman Kathmandu",
  footerCopyrightNe: "",
  newsletterHeading: "Stay in touch",
  newsletterHeadingNe: "",
  newsletterDescription:
    "Notes from the showroom, new arrivals, occasional letters.",
  newsletterDescriptionNe: "",
  naturePageEyebrow: "Nature",
  naturePageEyebrowNe: "",
  naturePageHeading: "Six elements, one curation",
  naturePageHeadingNe: "",
  naturePageSubheading:
    "Wood, water, metal, earth, plant, and air — every object on this page is shaped by one of these.",
  naturePageSubheadingNe: "",
  energyPageEyebrow: "Energy",
  energyPageEyebrowNe: "",
  energyPageHeading: "Sit, breathe, be sound",
  energyPageHeadingNe: "",
  energyPageSubheading:
    "Sound healing, breath work, and slow guided practice — at our showrooms or above the city in the pine.",
  energyPageSubheadingNe: "",
  energyPageEmptyState:
    "No energy services scheduled at the moment. Please check back soon.",
  energyPageEmptyStateNe: "",
  storiesPageEyebrow: "Shaman Stories",
  storiesPageEyebrowNe: "",
  storiesPageHeading: "A return to the elements",
  storiesPageHeadingNe: "",
  storiesPageSubheading:
    "A journey by Shaman Kathmandu into the elements, the unseen forces, and the wisdom of nature.",
  storiesPageSubheadingNe: "",
  storiesPageNepaliCouplet: "शक्ति बाहिर होइन।\nयही सृष्टिभित्र छ।",
  contactHeading: "Visit a showroom, or WhatsApp us.",
  contactHeadingNe: "",
  contactSubheading: "We answer most messages the same day.",
  contactSubheadingNe: "",
  contactResponseNote:
    "Most enquiries are answered the same day. For pieces that ship internationally we will quote you on a parcel-by-parcel basis.",
  contactResponseNoteNe: "",
};

export default function SiteConfigPage() {
  const toast = useToast();
  const [site, setSite] = useState<ExtendedSite | null>(null);
  const [snap, setSnap] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/sysuser/site")
      .then((r) => r.json())
      .then((j) => {
        const next = j.site as ExtendedSite | null;
        if (next) {
          if (!next.branding.faviconUrl) next.branding.faviconUrl = "";
          if (!next.homeCopy) next.homeCopy = {};
          if (!next.nav) next.nav = {};
          setSite(next);
          setSnap(JSON.stringify(next));
        }
      });
  }, []);

  const dirty = site ? JSON.stringify(site) !== snap : false;
  useUnsavedGuard(dirty);

  if (!site) return <div className="opacity-60">Loading…</div>;

  const copy: HomeCopy = { ...DEFAULT_HOME_COPY, ...(site.homeCopy ?? {}) };
  const setCopy = <K extends keyof HomeCopy>(key: K, value: HomeCopy[K]) => {
    setSite({
      ...site,
      homeCopy: { ...(site.homeCopy ?? {}), [key]: value },
    });
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/sysuser/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(site),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Save failed", j?.message ?? undefined);
      return;
    }
    setSnap(JSON.stringify(site));
    toast.success("Site config saved");
  };

  const setSocial = (key: string, value: string) => {
    setSite({
      ...site,
      contact: {
        ...site.contact,
        socials: { ...site.contact.socials, [key]: value },
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Site" }, { label: "Brand & SEO" }]}
        title="Site configuration"
        description="Brand, contact, SEO, and every editable string on the home page."
        actions={
          <Button onClick={save} loading={saving} disabled={!dirty}>
            Save
          </Button>
        }
      />

      <Tabs defaultValue="brand">
        <TabList>
          <Tab value="brand">Brand</Tab>
          <Tab value="copy">Home copy</Tab>
          <Tab value="navigation">Navigation</Tab>
          <Tab value="contact">Contact</Tab>
          <Tab value="seo">SEO</Tab>
          <Tab value="locale">Locale</Tab>
        </TabList>

        <TabPanel value="brand">
          <Card title="Identity">
            <FieldGrid cols={2}>
              <Field label="Site name">
                <TextInput
                  value={site.name}
                  onChange={(e) => setSite({ ...site, name: e.target.value })}
                />
              </Field>
              <Field label="Tagline">
                <TextInput
                  value={site.tagline}
                  onChange={(e) => setSite({ ...site, tagline: e.target.value })}
                />
              </Field>
            </FieldGrid>
          </Card>

          <Card title="Logo & favicon">
            <FieldGrid cols={2}>
              <Field label="Logo URL" hint="Shown in the public header & footer.">
                <div className="flex items-center gap-2">
                  <TextInput
                    value={site.branding.logoUrl}
                    onChange={(e) =>
                      setSite({
                        ...site,
                        branding: { ...site.branding, logoUrl: e.target.value },
                      })
                    }
                  />
                  <ImageUploader
                    onUploaded={(url) =>
                      setSite({
                        ...site,
                        branding: { ...site.branding, logoUrl: url },
                      })
                    }
                    label="Upload"
                  />
                </div>
                {site.branding.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={site.branding.logoUrl}
                    alt=""
                    className="mt-2 h-10 w-auto rounded border border-[var(--color-border)] bg-[var(--color-base)] p-1"
                  />
                )}
              </Field>
              <Field label="Favicon URL" hint="Browser tab icon. PNG or ICO.">
                <div className="flex items-center gap-2">
                  <TextInput
                    value={site.branding.faviconUrl ?? ""}
                    onChange={(e) =>
                      setSite({
                        ...site,
                        branding: {
                          ...site.branding,
                          faviconUrl: e.target.value,
                        },
                      })
                    }
                  />
                  <ImageUploader
                    accept="image/*"
                    onUploaded={(url) =>
                      setSite({
                        ...site,
                        branding: { ...site.branding, faviconUrl: url },
                      })
                    }
                    label="Upload"
                  />
                </div>
                {site.branding.faviconUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={site.branding.faviconUrl}
                    alt=""
                    className="mt-2 h-8 w-8 rounded border border-[var(--color-border)] bg-[var(--color-base)] p-1"
                  />
                )}
              </Field>
            </FieldGrid>
          </Card>

          <Card title="Brand colors">
            <FieldGrid cols={3}>
              {(["primary", "secondary", "accent"] as const).map((k) => (
                <Field key={k} label={k}>
                  <ColorPicker
                    value={site.branding.colors[k]}
                    onChange={(v) =>
                      setSite({
                        ...site,
                        branding: {
                          ...site.branding,
                          colors: { ...site.branding.colors, [k]: v },
                        },
                      })
                    }
                  />
                </Field>
              ))}
            </FieldGrid>
          </Card>
        </TabPanel>

        <TabPanel value="copy">
          <Card
            title="Hero"
            description="The block at the top of the home page."
          >
            <FieldGrid cols={2}>
              <div>
                <BilingualField
                  label="Eyebrow"
                  enValue={copy.heroEyebrow}
                  neValue={copy.heroEyebrowNe}
                  onEnChange={(v) => setCopy("heroEyebrow", v)}
                  onNeChange={(v) => setCopy("heroEyebrowNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="CTA label"
                  enValue={copy.heroCtaLabel}
                  neValue={copy.heroCtaLabelNe}
                  onEnChange={(v) => setCopy("heroCtaLabel", v)}
                  onNeChange={(v) => setCopy("heroCtaLabelNe", v ?? "")}
                />
              </div>
            </FieldGrid>
            <div className="mt-4">
              <BilingualField
                label="Title"
                enValue={copy.heroTitle}
                neValue={copy.heroTitleNe}
                onEnChange={(v) => setCopy("heroTitle", v)}
                onNeChange={(v) => setCopy("heroTitleNe", v ?? "")}
              />
            </div>
            <div className="mt-4">
              <BilingualField
                label="Subtitle"
                multiline
                enValue={copy.heroSubtitle}
                neValue={copy.heroSubtitleNe}
                onEnChange={(v) => setCopy("heroSubtitle", v)}
                onNeChange={(v) => setCopy("heroSubtitleNe", v ?? "")}
              />
            </div>
            <div className="mt-4">
              <Field label="CTA link" hint="Path on the site, e.g. /nature">
                <TextInput
                  value={copy.heroCtaHref}
                  onChange={(e) => setCopy("heroCtaHref", e.target.value)}
                />
              </Field>
            </div>
          </Card>

          
          {/* 
            NOTE: The remaining homeCopy fields (elementsHeading/Subheading, categoriesEyebrow/Heading/Subheading, 
            newReleasesEyebrow/Heading/Subheading, etc.) all follow the same bilingual pattern with corresponding 
            <fieldName>Ne keys. Section headings and eyebrows support both English and Nepali translations via 
            <fieldName> and <fieldName>Ne state properties. As needed, replace TextInput/Textarea with BilingualField 
            for any additional fields.
          */}

          
<Card
            title="Brand strip"
            description="Three-column band under the hero. Each card has a title and a short body."
          >
            <div className="space-y-3">
              {copy.brandStripCards.map((card, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-base)] p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-wider opacity-60">
                      Card {i + 1}
                    </span>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        setCopy(
                          "brandStripCards",
                          copy.brandStripCards.filter((_, j) => j !== i),
                        )
                      }
                    >
                      Remove
                    </Button>
                  </div>
                  <Field label="Title">
                    <TextInput
                      value={card.title}
                      onChange={(e) =>
                        setCopy(
                          "brandStripCards",
                          copy.brandStripCards.map((c, j) =>
                            j === i ? { ...c, title: e.target.value } : c,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label="Body">
                    <Textarea
                      rows={2}
                      value={card.body}
                      onChange={(e) =>
                        setCopy(
                          "brandStripCards",
                          copy.brandStripCards.map((c, j) =>
                            j === i ? { ...c, body: e.target.value } : c,
                          ),
                        )
                      }
                    />
                  </Field>
                </div>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  setCopy("brandStripCards", [
                    ...copy.brandStripCards,
                    { title: "", body: "" },
                  ])
                }
              >
                + Add card
              </Button>
            </div>
          </Card>

          <Card title="Home section headings">
            <FieldGrid cols={2}>
              <div>
                <BilingualField
                  label="Elements heading"
                  enValue={copy.elementsHeading}
                  neValue={copy.elementsHeadingNe}
                  onEnChange={(v) => setCopy("elementsHeading", v)}
                  onNeChange={(v) => setCopy("elementsHeadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Elements subheading"
                  enValue={copy.elementsSubheading}
                  neValue={copy.elementsSubheadingNe}
                  onEnChange={(v) => setCopy("elementsSubheading", v)}
                  onNeChange={(v) => setCopy("elementsSubheadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Categories eyebrow"
                  enValue={copy.categoriesEyebrow}
                  neValue={copy.categoriesEyebrowNe}
                  onEnChange={(v) => setCopy("categoriesEyebrow", v)}
                  onNeChange={(v) => setCopy("categoriesEyebrowNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Categories heading"
                  enValue={copy.categoriesHeading}
                  neValue={copy.categoriesHeadingNe}
                  onEnChange={(v) => setCopy("categoriesHeading", v)}
                  onNeChange={(v) => setCopy("categoriesHeadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Categories subheading"
                  enValue={copy.categoriesSubheading}
                  neValue={copy.categoriesSubheadingNe}
                  onEnChange={(v) => setCopy("categoriesSubheading", v)}
                  onNeChange={(v) => setCopy("categoriesSubheadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="New releases eyebrow"
                  enValue={copy.newReleasesEyebrow}
                  neValue={copy.newReleasesEyebrowNe}
                  onEnChange={(v) => setCopy("newReleasesEyebrow", v)}
                  onNeChange={(v) => setCopy("newReleasesEyebrowNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="New releases heading"
                  enValue={copy.newReleasesHeading}
                  neValue={copy.newReleasesHeadingNe}
                  onEnChange={(v) => setCopy("newReleasesHeading", v)}
                  onNeChange={(v) => setCopy("newReleasesHeadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="New releases subheading"
                  enValue={copy.newReleasesSubheading}
                  neValue={copy.newReleasesSubheadingNe}
                  onEnChange={(v) => setCopy("newReleasesSubheading", v)}
                  onNeChange={(v) => setCopy("newReleasesSubheadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Featured story eyebrow"
                  enValue={copy.featuredStoryEyebrow}
                  neValue={copy.featuredStoryEyebrowNe}
                  onEnChange={(v) => setCopy("featuredStoryEyebrow", v)}
                  onNeChange={(v) => setCopy("featuredStoryEyebrowNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Featured story heading"
                  enValue={copy.featuredStoryHeading}
                  neValue={copy.featuredStoryHeadingNe}
                  onEnChange={(v) => setCopy("featuredStoryHeading", v)}
                  onNeChange={(v) => setCopy("featuredStoryHeadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Featured story subheading"
                  multiline
                  enValue={copy.featuredStorySubheading}
                  neValue={copy.featuredStorySubheadingNe}
                  onEnChange={(v) => setCopy("featuredStorySubheading", v)}
                  onNeChange={(v) => setCopy("featuredStorySubheadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Services eyebrow"
                  enValue={copy.servicesEyebrow}
                  neValue={copy.servicesEyebrowNe}
                  onEnChange={(v) => setCopy("servicesEyebrow", v)}
                  onNeChange={(v) => setCopy("servicesEyebrowNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Services heading"
                  enValue={copy.servicesHeading}
                  neValue={copy.servicesHeadingNe}
                  onEnChange={(v) => setCopy("servicesHeading", v)}
                  onNeChange={(v) => setCopy("servicesHeadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Services subheading"
                  multiline
                  enValue={copy.servicesSubheading}
                  neValue={copy.servicesSubheadingNe}
                  onEnChange={(v) => setCopy("servicesSubheading", v)}
                  onNeChange={(v) => setCopy("servicesSubheadingNe", v ?? "")}
                />
              </div>
            </FieldGrid>
          </Card>

          <Card
            title="Sub-page copy"
            description="Headings and intros for /nature, /energy, /stories, /contact."
          >
            <FieldGrid cols={2}>
              <div>
                <BilingualField
                  label="Nature page eyebrow"
                  enValue={copy.naturePageEyebrow}
                  neValue={copy.naturePageEyebrowNe}
                  onEnChange={(v) => setCopy("naturePageEyebrow", v)}
                  onNeChange={(v) => setCopy("naturePageEyebrowNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Nature page heading"
                  enValue={copy.naturePageHeading}
                  neValue={copy.naturePageHeadingNe}
                  onEnChange={(v) => setCopy("naturePageHeading", v)}
                  onNeChange={(v) => setCopy("naturePageHeadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Nature page subheading"
                  multiline
                  enValue={copy.naturePageSubheading}
                  neValue={copy.naturePageSubheadingNe}
                  onEnChange={(v) => setCopy("naturePageSubheading", v)}
                  onNeChange={(v) => setCopy("naturePageSubheadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Energy page eyebrow"
                  enValue={copy.energyPageEyebrow}
                  neValue={copy.energyPageEyebrowNe}
                  onEnChange={(v) => setCopy("energyPageEyebrow", v)}
                  onNeChange={(v) => setCopy("energyPageEyebrowNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Energy page heading"
                  enValue={copy.energyPageHeading}
                  neValue={copy.energyPageHeadingNe}
                  onEnChange={(v) => setCopy("energyPageHeading", v)}
                  onNeChange={(v) => setCopy("energyPageHeadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Energy page subheading"
                  multiline
                  enValue={copy.energyPageSubheading}
                  neValue={copy.energyPageSubheadingNe}
                  onEnChange={(v) => setCopy("energyPageSubheading", v)}
                  onNeChange={(v) => setCopy("energyPageSubheadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Energy empty state"
                  hint="Shown when no services exist."
                  enValue={copy.energyPageEmptyState}
                  neValue={copy.energyPageEmptyStateNe}
                  onEnChange={(v) => setCopy("energyPageEmptyState", v)}
                  onNeChange={(v) => setCopy("energyPageEmptyStateNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Stories page eyebrow"
                  enValue={copy.storiesPageEyebrow}
                  neValue={copy.storiesPageEyebrowNe}
                  onEnChange={(v) => setCopy("storiesPageEyebrow", v)}
                  onNeChange={(v) => setCopy("storiesPageEyebrowNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Stories page heading"
                  enValue={copy.storiesPageHeading}
                  neValue={copy.storiesPageHeadingNe}
                  onEnChange={(v) => setCopy("storiesPageHeading", v)}
                  onNeChange={(v) => setCopy("storiesPageHeadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Stories page subheading"
                  multiline
                  enValue={copy.storiesPageSubheading}
                  neValue={copy.storiesPageSubheadingNe}
                  onEnChange={(v) => setCopy("storiesPageSubheading", v)}
                  onNeChange={(v) => setCopy("storiesPageSubheadingNe", v ?? "")}
                />
              </div>
              <Field
                label="Stories Nepali couplet"
                hint="Use line breaks for multi-line."
              >
                <Textarea
                  rows={2}
                  value={copy.storiesPageNepaliCouplet}
                  onChange={(e) =>
                    setCopy("storiesPageNepaliCouplet", e.target.value)
                  }
                />
              </Field>
              <div>
                <BilingualField
                  label="Contact page heading"
                  enValue={copy.contactHeading}
                  neValue={copy.contactHeadingNe}
                  onEnChange={(v) => setCopy("contactHeading", v)}
                  onNeChange={(v) => setCopy("contactHeadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Contact page subheading"
                  enValue={copy.contactSubheading}
                  neValue={copy.contactSubheadingNe}
                  onEnChange={(v) => setCopy("contactSubheading", v)}
                  onNeChange={(v) => setCopy("contactSubheadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Contact response note"
                  multiline
                  enValue={copy.contactResponseNote}
                  neValue={copy.contactResponseNoteNe}
                  onEnChange={(v) => setCopy("contactResponseNote", v)}
                  onNeChange={(v) => setCopy("contactResponseNoteNe", v ?? "")}
                />
              </div>
            </FieldGrid>
          </Card>

          <Card title="Newsletter & footer">
            <FieldGrid cols={2}>
              <div>
                <BilingualField
                  label="Newsletter heading"
                  enValue={copy.newsletterHeading}
                  neValue={copy.newsletterHeadingNe}
                  onEnChange={(v) => setCopy("newsletterHeading", v)}
                  onNeChange={(v) => setCopy("newsletterHeadingNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Newsletter description"
                  enValue={copy.newsletterDescription}
                  neValue={copy.newsletterDescriptionNe}
                  onEnChange={(v) => setCopy("newsletterDescription", v)}
                  onNeChange={(v) => setCopy("newsletterDescriptionNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Footer tagline"
                  multiline
                  enValue={copy.footerTagline}
                  neValue={copy.footerTaglineNe}
                  onEnChange={(v) => setCopy("footerTagline", v)}
                  onNeChange={(v) => setCopy("footerTaglineNe", v ?? "")}
                />
              </div>
              <div>
                <BilingualField
                  label="Footer copyright line"
                  enValue={copy.footerCopyright}
                  neValue={copy.footerCopyrightNe}
                  onEnChange={(v) => setCopy("footerCopyright", v)}
                  onNeChange={(v) => setCopy("footerCopyrightNe", v ?? "")}
                />
              </div>
            </FieldGrid>
          </Card>
        </TabPanel>

        <TabPanel value="navigation">
          <NavEditor
            nav={{ ...DEFAULT_NAV, ...(site.nav ?? {}) } as NavConfig}
            onChange={(next) => setSite({ ...site, nav: next })}
          />
        </TabPanel>

        <TabPanel value="contact">
          <Card>
            <FieldGrid cols={2}>
              <Field label="Email">
                <TextInput
                  value={site.contact.email}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      contact: { ...site.contact, email: e.target.value },
                    })
                  }
                />
              </Field>
              <Field label="Phone">
                <TextInput
                  value={site.contact.phone}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      contact: { ...site.contact, phone: e.target.value },
                    })
                  }
                />
              </Field>
            </FieldGrid>
            <div className="mt-4">
              <Field label="Address">
                <Textarea
                  rows={2}
                  value={site.contact.address}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      contact: { ...site.contact, address: e.target.value },
                    })
                  }
                />
              </Field>
            </div>
            <div className="mt-4">
              <FieldGrid cols={3}>
                {Object.entries(site.contact.socials).map(([k, v]) => (
                  <Field key={k} label={`Social: ${k}`}>
                    <TextInput
                      value={v}
                      onChange={(e) => setSocial(k, e.target.value)}
                    />
                  </Field>
                ))}
              </FieldGrid>
            </div>
          </Card>
        </TabPanel>

        <TabPanel value="seo">
          <Card title="Search-engine defaults">
            <Field label="Default title">
              <TextInput
                value={site.seo.title}
                onChange={(e) =>
                  setSite({
                    ...site,
                    seo: { ...site.seo, title: e.target.value },
                  })
                }
              />
            </Field>
            <div className="mt-4">
              <Field label="Default description">
                <Textarea
                  rows={2}
                  value={site.seo.description}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      seo: { ...site.seo, description: e.target.value },
                    })
                  }
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="OG image URL">
                <div className="flex items-center gap-2">
                  <TextInput
                    value={site.seo.ogImage}
                    onChange={(e) =>
                      setSite({
                        ...site,
                        seo: { ...site.seo, ogImage: e.target.value },
                      })
                    }
                  />
                  <ImageUploader
                    onUploaded={(url) =>
                      setSite({
                        ...site,
                        seo: { ...site.seo, ogImage: url },
                      })
                    }
                    label="Upload"
                  />
                </div>
              </Field>
            </div>
          </Card>
        </TabPanel>

        <TabPanel value="locale">
          <Card>
            <FieldGrid cols={3}>
              <Field label="Currency">
                <TextInput
                  value={site.currency}
                  onChange={(e) =>
                    setSite({ ...site, currency: e.target.value })
                  }
                />
              </Field>
              <Field label="Default locale">
                <TextInput
                  value={site.defaultLocale}
                  onChange={(e) =>
                    setSite({ ...site, defaultLocale: e.target.value })
                  }
                />
              </Field>
              <Field
                label="Locales"
                hint="Comma-separated language codes."
              >
                <TextInput
                  value={site.locales.join(", ")}
                  onChange={(e) =>
                    setSite({
                      ...site,
                      locales: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
            </FieldGrid>
          </Card>
        </TabPanel>
      </Tabs>

      <StickySaveBar visible={dirty} saving={saving} onSave={save} />
    </div>
  );
}
