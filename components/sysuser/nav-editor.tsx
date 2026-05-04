"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FieldGrid } from "@/components/ui/section";
import { Field, TextInput } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  heading: string;
  links: NavLink[];
}

export interface SocialLink {
  key: string;
  label: string;
  href: string;
}

export interface NavConfig {
  logoHref: string;
  heroPrimaryCta: NavLink;
  heroSecondaryCta: NavLink;
  heroScrollHref: string;
  newReleasesAllCta: NavLink;
  servicesAllCta: NavLink;
  storiesAllCta: NavLink;
  headerLinks: NavLink[];
  headerLoginLabel: string;
  headerLoginHref: string;
  headerSearchHref: string;
  headerWishlistHref: string;
  footerColumns: FooterColumn[];
  footerLegalLinks: NavLink[];
  footerQuote: string;
  footerSocials: SocialLink[];
  ctaProductEnquireLabel: string;
  ctaWhatsappFloatLabel: string;
  ctaNewsletterButtonLabel: string;
}

export const DEFAULT_NAV: NavConfig = {
  logoHref: "/",
  heroPrimaryCta: { label: "Explore Nature", href: "/nature" },
  heroSecondaryCta: { label: "Book Energy", href: "/energy" },
  heroScrollHref: "/stories",
  newReleasesAllCta: { label: "Browse All Nature", href: "/nature" },
  servicesAllCta: { label: "Explore All Services", href: "/energy" },
  storiesAllCta: { label: "View All Stories", href: "/stories" },
  headerLinks: [
    { label: "Home", href: "/" },
    { label: "Nature", href: "/nature" },
    { label: "Energy", href: "/energy" },
    { label: "Shaman Stories", href: "/stories" },
  ],
  headerLoginLabel: "Login",
  headerLoginHref: "/account/login",
  headerSearchHref: "/search",
  headerWishlistHref: "/account/wishlist",
  footerColumns: [
    {
      heading: "Explore",
      links: [
        { label: "Nature", href: "/nature" },
        { label: "Energy Services", href: "/energy" },
        { label: "Shaman Stories", href: "/stories" },
        { label: "Bundles", href: "/bundles" },
      ],
    },
    {
      heading: "Support",
      links: [
        { label: "About", href: "/pages/about" },
        { label: "FAQ", href: "/pages/faq" },
        { label: "Contact", href: "mailto:info@shamankathmandu.com", external: true },
      ],
    },
  ],
  footerLegalLinks: [
    { label: "Privacy", href: "/pages/privacy" },
    { label: "Terms", href: "/pages/terms" },
  ],
  footerQuote: "Nature does not carry a passport. Neither do we.",
  footerSocials: [
    { key: "instagram", label: "Instagram", href: "" },
    { key: "tiktok", label: "TikTok", href: "" },
    { key: "facebook", label: "Facebook", href: "" },
    { key: "youtube", label: "YouTube", href: "" },
    { key: "whatsapp", label: "WhatsApp", href: "" },
  ],
  ctaProductEnquireLabel: "Enquire on WhatsApp",
  ctaWhatsappFloatLabel: "Enquire",
  ctaNewsletterButtonLabel: "Subscribe",
};

const SOCIAL_KEYS = [
  "instagram",
  "tiktok",
  "facebook",
  "youtube",
  "whatsapp",
] as const;

interface Props {
  nav: NavConfig;
  onChange: (next: NavConfig) => void;
}

export function NavEditor({ nav, onChange }: Props) {
  const updateLinks = (
    list: NavLink[],
    apply: (rows: NavLink[]) => NavLink[],
  ) => apply(list);

  const moveItem = <T,>(list: T[], i: number, dir: -1 | 1): T[] => {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return list;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };

  const setCta = (key: keyof NavConfig, link: NavLink) =>
    onChange({ ...nav, [key]: link } as NavConfig);

  return (
    <div className="space-y-6">
      <Card
        title="Logo link"
        description="Where the header & footer logo points to."
      >
        <Field label="Logo href">
          <TextInput
            value={nav.logoHref}
            onChange={(e) => onChange({ ...nav, logoHref: e.target.value })}
          />
        </Field>
      </Card>

      <Card
        title="Hero buttons"
        description="The two CTAs at the top of the homepage and the scroll-down link."
      >
        <FieldGrid cols={2}>
          <CtaPair
            label="Primary CTA"
            link={nav.heroPrimaryCta}
            onChange={(l) => setCta("heroPrimaryCta", l)}
          />
          <CtaPair
            label="Secondary CTA"
            link={nav.heroSecondaryCta}
            onChange={(l) => setCta("heroSecondaryCta", l)}
          />
        </FieldGrid>
        <div className="mt-4">
          <Field label="Scroll-down link href">
            <TextInput
              value={nav.heroScrollHref}
              onChange={(e) =>
                onChange({ ...nav, heroScrollHref: e.target.value })
              }
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Section ‘View all’ buttons"
        description="The CTA shown at the bottom of each homepage section."
      >
        <FieldGrid cols={1}>
          <CtaPair
            label="New releases"
            link={nav.newReleasesAllCta}
            onChange={(l) => setCta("newReleasesAllCta", l)}
          />
          <CtaPair
            label="Services preview"
            link={nav.servicesAllCta}
            onChange={(l) => setCta("servicesAllCta", l)}
          />
          <CtaPair
            label="Featured story"
            link={nav.storiesAllCta}
            onChange={(l) => setCta("storiesAllCta", l)}
          />
        </FieldGrid>
      </Card>

      <Card
        title="Header navigation"
        description="Primary links shown in the top bar (and mobile drawer). Order them with the arrows."
        actions={
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={12} />}
            onClick={() =>
              onChange({
                ...nav,
                headerLinks: [
                  ...nav.headerLinks,
                  { label: "New link", href: "/" },
                ],
              })
            }
          >
            Add link
          </Button>
        }
      >
        <div className="space-y-2">
          {nav.headerLinks.map((l, i) => (
            <LinkRow
              key={`hdr-${i}`}
              link={l}
              onChange={(next) => {
                const arr = [...nav.headerLinks];
                arr[i] = next;
                onChange({ ...nav, headerLinks: arr });
              }}
              onMoveUp={() =>
                onChange({
                  ...nav,
                  headerLinks: moveItem(nav.headerLinks, i, -1),
                })
              }
              onMoveDown={() =>
                onChange({
                  ...nav,
                  headerLinks: moveItem(nav.headerLinks, i, 1),
                })
              }
              onRemove={() =>
                onChange({
                  ...nav,
                  headerLinks: nav.headerLinks.filter((_, idx) => idx !== i),
                })
              }
            />
          ))}
          {nav.headerLinks.length === 0 && (
            <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-center text-xs opacity-60">
              No header links yet — add one to populate the top nav.
            </div>
          )}
        </div>
      </Card>

      <Card
        title="Header right-side actions"
        description="Empty an href to hide that icon. Empty the login label to hide the login link."
      >
        <FieldGrid cols={2}>
          <Field label="Login label">
            <TextInput
              value={nav.headerLoginLabel}
              onChange={(e) =>
                onChange({ ...nav, headerLoginLabel: e.target.value })
              }
            />
          </Field>
          <Field label="Login href">
            <TextInput
              value={nav.headerLoginHref}
              onChange={(e) =>
                onChange({ ...nav, headerLoginHref: e.target.value })
              }
            />
          </Field>
          <Field label="Search href">
            <TextInput
              value={nav.headerSearchHref}
              onChange={(e) =>
                onChange({ ...nav, headerSearchHref: e.target.value })
              }
            />
          </Field>
          <Field label="Wishlist / account href">
            <TextInput
              value={nav.headerWishlistHref}
              onChange={(e) =>
                onChange({ ...nav, headerWishlistHref: e.target.value })
              }
            />
          </Field>
        </FieldGrid>
      </Card>

      <Card
        title="Footer columns"
        description="Each column is a heading + a list of links. Add up to 3 (the 4th column is reserved for showrooms)."
        actions={
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus size={12} />}
            onClick={() =>
              onChange({
                ...nav,
                footerColumns: [
                  ...nav.footerColumns,
                  { heading: "New column", links: [] },
                ],
              })
            }
            disabled={nav.footerColumns.length >= 3}
          >
            Add column
          </Button>
        }
      >
        <div className="space-y-4">
          {nav.footerColumns.map((col, ci) => (
            <div
              key={`col-${ci}`}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] p-3"
            >
              <div className="mb-3 flex items-center gap-2">
                <Field label="Heading" className="flex-1">
                  <TextInput
                    value={col.heading}
                    onChange={(e) => {
                      const cols = [...nav.footerColumns];
                      cols[ci] = { ...col, heading: e.target.value };
                      onChange({ ...nav, footerColumns: cols });
                    }}
                  />
                </Field>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      ...nav,
                      footerColumns: moveItem(nav.footerColumns, ci, -1),
                    })
                  }
                >
                  <ArrowUp size={12} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    onChange({
                      ...nav,
                      footerColumns: moveItem(nav.footerColumns, ci, 1),
                    })
                  }
                >
                  <ArrowDown size={12} />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    onChange({
                      ...nav,
                      footerColumns: nav.footerColumns.filter(
                        (_, idx) => idx !== ci,
                      ),
                    })
                  }
                >
                  <Trash2 size={12} />
                </Button>
              </div>
              <div className="space-y-1.5">
                {col.links.map((l, li) => (
                  <LinkRow
                    key={`col-${ci}-link-${li}`}
                    link={l}
                    onChange={(next) => {
                      const cols = [...nav.footerColumns];
                      const links = [...col.links];
                      links[li] = next;
                      cols[ci] = { ...col, links };
                      onChange({ ...nav, footerColumns: cols });
                    }}
                    onMoveUp={() => {
                      const cols = [...nav.footerColumns];
                      cols[ci] = { ...col, links: moveItem(col.links, li, -1) };
                      onChange({ ...nav, footerColumns: cols });
                    }}
                    onMoveDown={() => {
                      const cols = [...nav.footerColumns];
                      cols[ci] = { ...col, links: moveItem(col.links, li, 1) };
                      onChange({ ...nav, footerColumns: cols });
                    }}
                    onRemove={() => {
                      const cols = [...nav.footerColumns];
                      cols[ci] = {
                        ...col,
                        links: col.links.filter((_, idx) => idx !== li),
                      };
                      onChange({ ...nav, footerColumns: cols });
                    }}
                  />
                ))}
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus size={12} />}
                  onClick={() => {
                    const cols = [...nav.footerColumns];
                    cols[ci] = {
                      ...col,
                      links: [...col.links, { label: "New link", href: "/" }],
                    };
                    onChange({ ...nav, footerColumns: cols });
                  }}
                >
                  Add link
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Footer bottom row">
        <Field label="Italic quote (above legal row)">
          <TextInput
            value={nav.footerQuote}
            onChange={(e) =>
              onChange({ ...nav, footerQuote: e.target.value })
            }
          />
        </Field>
        <div className="mt-4">
          <Field label="Legal links">
            <div className="space-y-1.5">
              {nav.footerLegalLinks.map((l, i) => (
                <LinkRow
                  key={`legal-${i}`}
                  link={l}
                  onChange={(next) => {
                    const arr = [...nav.footerLegalLinks];
                    arr[i] = next;
                    onChange({ ...nav, footerLegalLinks: arr });
                  }}
                  onMoveUp={() =>
                    onChange({
                      ...nav,
                      footerLegalLinks: moveItem(nav.footerLegalLinks, i, -1),
                    })
                  }
                  onMoveDown={() =>
                    onChange({
                      ...nav,
                      footerLegalLinks: moveItem(nav.footerLegalLinks, i, 1),
                    })
                  }
                  onRemove={() =>
                    onChange({
                      ...nav,
                      footerLegalLinks: nav.footerLegalLinks.filter(
                        (_, idx) => idx !== i,
                      ),
                    })
                  }
                />
              ))}
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus size={12} />}
                onClick={() =>
                  onChange({
                    ...nav,
                    footerLegalLinks: [
                      ...nav.footerLegalLinks,
                      { label: "New", href: "/pages/" },
                    ],
                  })
                }
              >
                Add legal link
              </Button>
            </div>
          </Field>
        </div>
      </Card>

      <Card title="Social links" description="Empty an href to hide that icon.">
        <div className="space-y-2">
          {SOCIAL_KEYS.map((key) => {
            const existing = nav.footerSocials.find((s) => s.key === key) ?? {
              key,
              label: key,
              href: "",
            };
            return (
              <div
                key={key}
                className="flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] p-2"
              >
                <span className="w-20 text-xs uppercase tracking-wider opacity-60">
                  {key}
                </span>
                <TextInput
                  value={existing.href}
                  placeholder="https://…"
                  onChange={(e) => {
                    const others = nav.footerSocials.filter((s) => s.key !== key);
                    onChange({
                      ...nav,
                      footerSocials: [
                        ...others,
                        { ...existing, href: e.target.value },
                      ],
                    });
                  }}
                  className="flex-1"
                />
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Reusable button labels">
        <FieldGrid cols={3}>
          <Field label="Product enquire CTA">
            <TextInput
              value={nav.ctaProductEnquireLabel}
              onChange={(e) =>
                onChange({ ...nav, ctaProductEnquireLabel: e.target.value })
              }
            />
          </Field>
          <Field label="WhatsApp float button">
            <TextInput
              value={nav.ctaWhatsappFloatLabel}
              onChange={(e) =>
                onChange({ ...nav, ctaWhatsappFloatLabel: e.target.value })
              }
            />
          </Field>
          <Field label="Newsletter subscribe button">
            <TextInput
              value={nav.ctaNewsletterButtonLabel}
              onChange={(e) =>
                onChange({ ...nav, ctaNewsletterButtonLabel: e.target.value })
              }
            />
          </Field>
        </FieldGrid>
      </Card>
    </div>
  );
}

function LinkRow({
  link,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  link: NavLink;
  onChange: (next: NavLink) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 md:grid-cols-[1fr_2fr_auto_auto]">
      <TextInput
        value={link.label}
        placeholder="Label"
        onChange={(e) => onChange({ ...link, label: e.target.value })}
      />
      <TextInput
        value={link.href}
        placeholder="/path or https://"
        onChange={(e) => onChange({ ...link, href: e.target.value })}
      />
      <div className="flex items-center gap-2">
        <Switch
          checked={!!link.external}
          onChange={(v) => onChange({ ...link, external: v || undefined })}
          size="sm"
          label="External"
        />
      </div>
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={onMoveUp}
          className="rounded p-1 opacity-50 hover:bg-[var(--color-base)] hover:opacity-100"
          aria-label="Move up"
        >
          <ArrowUp size={12} />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          className="rounded p-1 opacity-50 hover:bg-[var(--color-base)] hover:opacity-100"
          aria-label="Move down"
        >
          <ArrowDown size={12} />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-[var(--color-danger)] opacity-70 hover:opacity-100"
          aria-label="Remove"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function CtaPair({
  label,
  link,
  onChange,
}: {
  label: string;
  link: NavLink;
  onChange: (next: NavLink) => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] p-3">
      <div className="mb-2 text-[10px] uppercase tracking-wider opacity-60">
        {label}
      </div>
      <FieldGrid cols={2}>
        <Field label="Button label">
          <TextInput
            value={link.label}
            onChange={(e) => onChange({ ...link, label: e.target.value })}
          />
        </Field>
        <Field label="Href">
          <TextInput
            value={link.href}
            onChange={(e) => onChange({ ...link, href: e.target.value })}
          />
        </Field>
      </FieldGrid>
      <div className="mt-2">
        <Switch
          checked={!!link.external}
          onChange={(v) => onChange({ ...link, external: v || undefined })}
          size="sm"
          label="Opens in new tab"
        />
      </div>
    </div>
  );
}
