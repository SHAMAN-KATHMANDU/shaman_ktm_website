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
import type { SiteConfig } from "@/lib/api/types";

interface BrandStripCard {
  title: string;
  body: string;
}

interface HomeCopy {
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaHref: string;
  brandStripLines: string[];
  brandStripCards: BrandStripCard[];
  elementsHeading: string;
  elementsSubheading: string;
  newReleasesEyebrow: string;
  newReleasesHeading: string;
  newReleasesSubheading: string;
  featuredStoryEyebrow: string;
  featuredStoryHeading: string;
  featuredStorySubheading: string;
  servicesEyebrow: string;
  servicesHeading: string;
  servicesSubheading: string;
  footerTagline: string;
  footerCopyright: string;
  newsletterHeading: string;
  newsletterDescription: string;
  naturePageEyebrow: string;
  naturePageHeading: string;
  naturePageSubheading: string;
  energyPageEyebrow: string;
  energyPageHeading: string;
  energyPageSubheading: string;
  energyPageEmptyState: string;
  storiesPageEyebrow: string;
  storiesPageHeading: string;
  storiesPageSubheading: string;
  storiesPageNepaliCouplet: string;
  contactHeading: string;
  contactSubheading: string;
  contactResponseNote: string;
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
  heroCtaLabel: "Explore the elements",
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
  elementsSubheading: "Everything in nature carries energy.",
  newReleasesEyebrow: "New Releases",
  newReleasesHeading: "Newly arrived this season",
  newReleasesSubheading: "",
  featuredStoryEyebrow: "Shaman Stories",
  featuredStoryHeading: "The latest stories",
  featuredStorySubheading:
    "A journey by Shaman Kathmandu into the elements, the unseen forces, and the wisdom of nature.",
  servicesEyebrow: "Energy Services",
  servicesHeading: "Sit, breathe, be sound",
  servicesSubheading:
    "Sound healing, breath work, and slow guided practice — at our showrooms or above the city in the pine.",
  footerTagline:
    "Curated in Kathmandu. From the world. For the world. Four showrooms across the valley.",
  footerCopyright: "Shaman Kathmandu",
  newsletterHeading: "Stay in touch",
  newsletterDescription:
    "Notes from the showroom, new arrivals, occasional letters.",
  naturePageEyebrow: "Nature",
  naturePageHeading: "Six elements, one curation",
  naturePageSubheading:
    "Wood, water, metal, earth, plant, and air — every object on this page is shaped by one of these.",
  energyPageEyebrow: "Energy",
  energyPageHeading: "Sit, breathe, be sound",
  energyPageSubheading:
    "Sound healing, breath work, and slow guided practice — at our showrooms or above the city in the pine.",
  energyPageEmptyState:
    "No energy services scheduled at the moment. Please check back soon.",
  storiesPageEyebrow: "Shaman Stories",
  storiesPageHeading: "A return to the elements",
  storiesPageSubheading:
    "A journey by Shaman Kathmandu into the elements, the unseen forces, and the wisdom of nature.",
  storiesPageNepaliCouplet: "शक्ति बाहिर होइन।\nयही सृष्टिभित्र छ।",
  contactHeading: "Visit a showroom, or WhatsApp us.",
  contactSubheading: "We answer most messages the same day.",
  contactResponseNote:
    "Most enquiries are answered the same day. For pieces that ship internationally we will quote you on a parcel-by-parcel basis.",
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
              <Field label="Eyebrow">
                <TextInput
                  value={copy.heroEyebrow}
                  onChange={(e) => setCopy("heroEyebrow", e.target.value)}
                />
              </Field>
              <Field label="CTA label">
                <TextInput
                  value={copy.heroCtaLabel}
                  onChange={(e) => setCopy("heroCtaLabel", e.target.value)}
                />
              </Field>
            </FieldGrid>
            <div className="mt-4">
              <Field label="Title">
                <TextInput
                  value={copy.heroTitle}
                  onChange={(e) => setCopy("heroTitle", e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Subtitle">
                <Textarea
                  rows={2}
                  value={copy.heroSubtitle}
                  onChange={(e) => setCopy("heroSubtitle", e.target.value)}
                />
              </Field>
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

          <Card
            title="Brand strip cards"
            description="Three-column band under the hero. Each card has a title and a short body."
          >
            <div className="space-y-3">
              {copy.brandStripCards.map((card, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[var(--color-border)] bg-[var(--color-base)] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
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
              <Field label="Elements heading">
                <TextInput
                  value={copy.elementsHeading}
                  onChange={(e) => setCopy("elementsHeading", e.target.value)}
                />
              </Field>
              <Field label="Elements subheading">
                <TextInput
                  value={copy.elementsSubheading}
                  onChange={(e) => setCopy("elementsSubheading", e.target.value)}
                />
              </Field>
              <Field label="New releases eyebrow">
                <TextInput
                  value={copy.newReleasesEyebrow}
                  onChange={(e) => setCopy("newReleasesEyebrow", e.target.value)}
                />
              </Field>
              <Field label="New releases heading">
                <TextInput
                  value={copy.newReleasesHeading}
                  onChange={(e) => setCopy("newReleasesHeading", e.target.value)}
                />
              </Field>
              <Field label="New releases subheading">
                <TextInput
                  value={copy.newReleasesSubheading}
                  onChange={(e) =>
                    setCopy("newReleasesSubheading", e.target.value)
                  }
                />
              </Field>
              <Field label="Featured story eyebrow">
                <TextInput
                  value={copy.featuredStoryEyebrow}
                  onChange={(e) =>
                    setCopy("featuredStoryEyebrow", e.target.value)
                  }
                />
              </Field>
              <Field label="Featured story heading">
                <TextInput
                  value={copy.featuredStoryHeading}
                  onChange={(e) =>
                    setCopy("featuredStoryHeading", e.target.value)
                  }
                />
              </Field>
              <Field label="Featured story subheading">
                <Textarea
                  rows={2}
                  value={copy.featuredStorySubheading}
                  onChange={(e) =>
                    setCopy("featuredStorySubheading", e.target.value)
                  }
                />
              </Field>
              <Field label="Services eyebrow">
                <TextInput
                  value={copy.servicesEyebrow}
                  onChange={(e) => setCopy("servicesEyebrow", e.target.value)}
                />
              </Field>
              <Field label="Services heading">
                <TextInput
                  value={copy.servicesHeading}
                  onChange={(e) => setCopy("servicesHeading", e.target.value)}
                />
              </Field>
              <Field label="Services subheading">
                <Textarea
                  rows={2}
                  value={copy.servicesSubheading}
                  onChange={(e) =>
                    setCopy("servicesSubheading", e.target.value)
                  }
                />
              </Field>
            </FieldGrid>
          </Card>

          <Card
            title="Sub-page copy"
            description="Headings and intros for /nature, /energy, /stories, /contact."
          >
            <FieldGrid cols={2}>
              <Field label="Nature page eyebrow">
                <TextInput
                  value={copy.naturePageEyebrow}
                  onChange={(e) => setCopy("naturePageEyebrow", e.target.value)}
                />
              </Field>
              <Field label="Nature page heading">
                <TextInput
                  value={copy.naturePageHeading}
                  onChange={(e) => setCopy("naturePageHeading", e.target.value)}
                />
              </Field>
              <Field label="Nature page subheading">
                <Textarea
                  rows={2}
                  value={copy.naturePageSubheading}
                  onChange={(e) =>
                    setCopy("naturePageSubheading", e.target.value)
                  }
                />
              </Field>
              <Field label="Energy page eyebrow">
                <TextInput
                  value={copy.energyPageEyebrow}
                  onChange={(e) => setCopy("energyPageEyebrow", e.target.value)}
                />
              </Field>
              <Field label="Energy page heading">
                <TextInput
                  value={copy.energyPageHeading}
                  onChange={(e) => setCopy("energyPageHeading", e.target.value)}
                />
              </Field>
              <Field label="Energy page subheading">
                <Textarea
                  rows={2}
                  value={copy.energyPageSubheading}
                  onChange={(e) =>
                    setCopy("energyPageSubheading", e.target.value)
                  }
                />
              </Field>
              <Field
                label="Energy empty state"
                hint="Shown when no services exist."
              >
                <TextInput
                  value={copy.energyPageEmptyState}
                  onChange={(e) =>
                    setCopy("energyPageEmptyState", e.target.value)
                  }
                />
              </Field>
              <Field label="Stories page eyebrow">
                <TextInput
                  value={copy.storiesPageEyebrow}
                  onChange={(e) =>
                    setCopy("storiesPageEyebrow", e.target.value)
                  }
                />
              </Field>
              <Field label="Stories page heading">
                <TextInput
                  value={copy.storiesPageHeading}
                  onChange={(e) =>
                    setCopy("storiesPageHeading", e.target.value)
                  }
                />
              </Field>
              <Field label="Stories page subheading">
                <Textarea
                  rows={2}
                  value={copy.storiesPageSubheading}
                  onChange={(e) =>
                    setCopy("storiesPageSubheading", e.target.value)
                  }
                />
              </Field>
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
              <Field label="Contact page heading">
                <TextInput
                  value={copy.contactHeading}
                  onChange={(e) => setCopy("contactHeading", e.target.value)}
                />
              </Field>
              <Field label="Contact page subheading">
                <TextInput
                  value={copy.contactSubheading}
                  onChange={(e) =>
                    setCopy("contactSubheading", e.target.value)
                  }
                />
              </Field>
              <Field label="Contact response note">
                <Textarea
                  rows={2}
                  value={copy.contactResponseNote}
                  onChange={(e) =>
                    setCopy("contactResponseNote", e.target.value)
                  }
                />
              </Field>
            </FieldGrid>
          </Card>

          <Card title="Newsletter & footer">
            <FieldGrid cols={2}>
              <Field label="Newsletter heading">
                <TextInput
                  value={copy.newsletterHeading}
                  onChange={(e) => setCopy("newsletterHeading", e.target.value)}
                />
              </Field>
              <Field label="Newsletter description">
                <TextInput
                  value={copy.newsletterDescription}
                  onChange={(e) =>
                    setCopy("newsletterDescription", e.target.value)
                  }
                />
              </Field>
              <Field label="Footer tagline">
                <TextInput
                  value={copy.footerTagline}
                  onChange={(e) => setCopy("footerTagline", e.target.value)}
                />
              </Field>
              <Field label="Footer copyright line">
                <TextInput
                  value={copy.footerCopyright}
                  onChange={(e) => setCopy("footerCopyright", e.target.value)}
                />
              </Field>
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
