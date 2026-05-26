"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { FieldGrid } from "@/components/ui/section";
import { Field, TextInput } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LinkDestinationPicker } from "@/components/sysuser/link-destination-picker";

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
  const setCta = (key: keyof NavConfig, link: NavLink) =>
    onChange({ ...nav, [key]: link } as NavConfig);

  return (
    <div className="space-y-6">
      <Card
        title="Logo link"
        description="Where the header & footer logo points to."
      >
        <Field label="Logo destination">
          <HrefPicker
            href={nav.logoHref}
            onChange={(href) => onChange({ ...nav, logoHref: href })}
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
          <Field label="Scroll-down link destination">
            <HrefPicker
              href={nav.heroScrollHref}
              onChange={(href) => onChange({ ...nav, heroScrollHref: href })}
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
        description="Primary links shown in the top bar (and mobile drawer). Drag to reorder."
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
                  { label: "New link", href: "" },
                ],
              })
            }
          >
            Add link
          </Button>
        }
      >
        <SortableLinkList
          idPrefix="hdr"
          links={nav.headerLinks}
          onChange={(next) => onChange({ ...nav, headerLinks: next })}
          emptyMessage="No header links yet — add one to populate the top nav."
        />
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
          <Field label="Login destination">
            <HrefPicker
              href={nav.headerLoginHref}
              onChange={(href) => onChange({ ...nav, headerLoginHref: href })}
            />
          </Field>
          <Field label="Search destination">
            <HrefPicker
              href={nav.headerSearchHref}
              onChange={(href) => onChange({ ...nav, headerSearchHref: href })}
            />
          </Field>
          <Field label="Wishlist / account destination">
            <HrefPicker
              href={nav.headerWishlistHref}
              onChange={(href) =>
                onChange({ ...nav, headerWishlistHref: href })
              }
            />
          </Field>
        </FieldGrid>
      </Card>

      <Card
        title="Footer columns"
        description="Each column is a heading + a list of links. Drag columns or links to reorder. Up to 3 columns (the 4th is reserved for showrooms)."
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
        <SortableColumnList nav={nav} onChange={onChange} />
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
            <SortableLinkList
              idPrefix="legal"
              links={nav.footerLegalLinks}
              onChange={(next) =>
                onChange({ ...nav, footerLegalLinks: next })
              }
              emptyMessage="No legal links yet."
            />
            <div className="mt-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus size={12} />}
                onClick={() =>
                  onChange({
                    ...nav,
                    footerLegalLinks: [
                      ...nav.footerLegalLinks,
                      { label: "New", href: "" },
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

      <Card
        title="Social links"
        description="Empty a destination to hide that icon. Use the Custom URL tab to paste an external profile link."
      >
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
                <div className="flex-1">
                  <HrefPicker
                    href={existing.href}
                    defaultKind="__custom"
                    placeholder="https://…"
                    onChange={(href) => {
                      const others = nav.footerSocials.filter(
                        (s) => s.key !== key,
                      );
                      onChange({
                        ...nav,
                        footerSocials: [...others, { ...existing, href }],
                      });
                    }}
                  />
                </div>
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

function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
}

function SortableLinkList({
  idPrefix,
  links,
  onChange,
  emptyMessage,
}: {
  idPrefix: string;
  links: NavLink[];
  onChange: (next: NavLink[]) => void;
  emptyMessage: string;
}) {
  const sensors = useDndSensors();
  const ids = links.map((_, i) => `${idPrefix}-${i}`);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChange(arrayMove(links, from, to));
  };

  if (links.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4 text-center text-xs opacity-60">
        {emptyMessage}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {links.map((l, i) => (
            <SortableLinkRow
              key={ids[i]}
              id={ids[i]}
              link={l}
              onChange={(next) => {
                const arr = [...links];
                arr[i] = next;
                onChange(arr);
              }}
              onRemove={() =>
                onChange(links.filter((_, idx) => idx !== i))
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableLinkRow({
  id,
  link,
  onChange,
  onRemove,
}: {
  id: string;
  link: NavLink;
  onChange: (next: NavLink) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  } as const;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2 md:grid-cols-[auto_1fr_2fr_auto_auto]"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-1 opacity-50 hover:bg-[var(--color-base)] hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
        title="Drag to reorder"
      >
        <GripVertical size={14} />
      </button>
      <TextInput
        value={link.label}
        placeholder="Label"
        onChange={(e) => onChange({ ...link, label: e.target.value })}
      />
      <LinkDestinationPicker
        value={link}
        onChange={(next) => onChange({ ...link, ...next })}
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

function SortableColumnList({
  nav,
  onChange,
}: {
  nav: NavConfig;
  onChange: (next: NavConfig) => void;
}) {
  const sensors = useDndSensors();
  const ids = nav.footerColumns.map((_, i) => `col-${i}`);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onChange({ ...nav, footerColumns: arrayMove(nav.footerColumns, from, to) });
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-4">
          {nav.footerColumns.map((col, ci) => (
            <SortableColumn
              key={ids[ci]}
              id={ids[ci]}
              column={col}
              columnIndex={ci}
              onChangeColumn={(next) => {
                const cols = [...nav.footerColumns];
                cols[ci] = next;
                onChange({ ...nav, footerColumns: cols });
              }}
              onRemove={() =>
                onChange({
                  ...nav,
                  footerColumns: nav.footerColumns.filter(
                    (_, idx) => idx !== ci,
                  ),
                })
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableColumn({
  id,
  column,
  columnIndex,
  onChangeColumn,
  onRemove,
}: {
  id: string;
  column: FooterColumn;
  columnIndex: number;
  onChangeColumn: (next: FooterColumn) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  } as const;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] p-3"
    >
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded p-1 opacity-50 hover:bg-[var(--color-surface)] hover:opacity-100 active:cursor-grabbing"
          aria-label="Drag column to reorder"
          title="Drag column to reorder"
        >
          <GripVertical size={14} />
        </button>
        <Field label="Heading" className="flex-1">
          <TextInput
            value={column.heading}
            onChange={(e) =>
              onChangeColumn({ ...column, heading: e.target.value })
            }
          />
        </Field>
        <Button size="sm" variant="danger" onClick={onRemove}>
          <Trash2 size={12} />
        </Button>
      </div>
      <SortableLinkList
        idPrefix={`col-${columnIndex}-link`}
        links={column.links}
        onChange={(next) => onChangeColumn({ ...column, links: next })}
        emptyMessage="No links in this column yet."
      />
      <div className="mt-2">
        <Button
          size="sm"
          variant="secondary"
          icon={<Plus size={12} />}
          onClick={() =>
            onChangeColumn({
              ...column,
              links: [...column.links, { label: "New link", href: "" }],
            })
          }
        >
          Add link
        </Button>
      </div>
    </div>
  );
}

function HrefPicker({
  href,
  onChange,
  defaultKind,
  placeholder,
}: {
  href: string;
  onChange: (next: string) => void;
  defaultKind?: string;
  placeholder?: string;
}) {
  return (
    <LinkDestinationPicker
      value={{ label: "", href, external: false }}
      onChange={(next) => onChange(next.href)}
      defaultKind={defaultKind}
      hideLabel
      triggerLabel={placeholder ? "Set…" : "Change…"}
    />
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
        <Field label="Destination">
          <LinkDestinationPicker
            value={link}
            onChange={(next) => onChange({ ...link, ...next })}
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
