"use client";

import { useEffect, useState } from "react";
import { Button, Field, TextInput, Textarea } from "@/components/sysuser/form";
import type { SiteConfig } from "@/lib/api/types";

export default function SiteConfigPage() {
  const [site, setSite] = useState<SiteConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sysuser/site")
      .then((r) => r.json())
      .then((j) => setSite(j.site));
  }, []);

  if (!site) return <div className="opacity-60">Loading…</div>;

  const save = async () => {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/sysuser/site", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(site),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(j?.message ?? "Save failed");
    }
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Site config</h1>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      {error && (
        <div className="rounded bg-[var(--color-danger)]/20 p-3 text-sm text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
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
      </div>

      <h2 className="mt-6 font-display text-xl">Branding</h2>
      <Field label="Logo URL">
        <TextInput
          value={site.branding.logoUrl}
          onChange={(e) =>
            setSite({
              ...site,
              branding: { ...site.branding, logoUrl: e.target.value },
            })
          }
        />
      </Field>
      <div className="grid gap-4 md:grid-cols-3">
        {(["primary", "secondary", "accent"] as const).map((k) => (
          <Field key={k} label={`Color ${k}`}>
            <TextInput
              value={site.branding.colors[k]}
              onChange={(e) =>
                setSite({
                  ...site,
                  branding: {
                    ...site.branding,
                    colors: { ...site.branding.colors, [k]: e.target.value },
                  },
                })
              }
            />
          </Field>
        ))}
      </div>

      <h2 className="mt-6 font-display text-xl">Contact</h2>
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
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
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(site.contact.socials).map(([k, v]) => (
          <Field key={k} label={`Social: ${k}`}>
            <TextInput value={v} onChange={(e) => setSocial(k, e.target.value)} />
          </Field>
        ))}
      </div>

      <h2 className="mt-6 font-display text-xl">SEO defaults</h2>
      <Field label="SEO title">
        <TextInput
          value={site.seo.title}
          onChange={(e) =>
            setSite({ ...site, seo: { ...site.seo, title: e.target.value } })
          }
        />
      </Field>
      <Field label="SEO description">
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
      <Field label="OG image URL">
        <TextInput
          value={site.seo.ogImage}
          onChange={(e) =>
            setSite({ ...site, seo: { ...site.seo, ogImage: e.target.value } })
          }
        />
      </Field>
    </div>
  );
}
