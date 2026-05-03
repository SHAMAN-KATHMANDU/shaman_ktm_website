"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { StickySaveBar } from "@/components/ui/sticky-save-bar";
import { useUnsavedGuard } from "@/components/sysuser/use-unsaved-guard";
import { useToast } from "@/components/ui/toast";

interface Modules {
  homeHero: boolean;
  homeBrandStrip: boolean;
  homeElementsGrid: boolean;
  homeNewReleases: boolean;
  homeFeaturedStory: boolean;
  homeServicesPreview: boolean;
  blogIndex: boolean;
  bundlesIndex: boolean;
  collectionsIndex: boolean;
  servicesIndex: boolean;
  showroomsList: boolean;
  whatsappFloat: boolean;
  search: boolean;
  reviews: boolean;
  cart: boolean;
  announcementBar: boolean;
  comingSoonOverlay: boolean;
}

interface Group {
  title: string;
  description: string;
  modules: { key: keyof Modules; label: string; helper: string }[];
}

const GROUPS: Group[] = [
  {
    title: "Home page sections",
    description: "Toggle individual blocks of the public home page.",
    modules: [
      { key: "homeHero", label: "Hero", helper: "Main hero block at the top." },
      { key: "homeBrandStrip", label: "Brand strip", helper: "Curated-in-Kathmandu strip below the hero." },
      { key: "homeElementsGrid", label: "Elements grid", helper: "Six-element clickable tiles." },
      { key: "homeNewReleases", label: "New releases", helper: "Curated product lineup." },
      { key: "homeFeaturedStory", label: "Featured story", helper: "Featured blog post slot." },
      { key: "homeServicesPreview", label: "Services preview", helper: "Healing services tiles." },
    ],
  },
  {
    title: "Public listing pages",
    description: "Hide entire listing pages from the site.",
    modules: [
      { key: "blogIndex", label: "Blog index", helper: "/stories listing page." },
      { key: "bundlesIndex", label: "Bundles index", helper: "/bundles listing page." },
      { key: "collectionsIndex", label: "Collections index", helper: "/collections listing." },
      { key: "servicesIndex", label: "Services index", helper: "Healing-services listing." },
      { key: "showroomsList", label: "Showrooms list", helper: "Footer + dedicated showrooms list." },
    ],
  },
  {
    title: "Site-wide features",
    description: "Toggle global UX features.",
    modules: [
      { key: "whatsappFloat", label: "WhatsApp float", helper: "Floating WhatsApp button." },
      { key: "search", label: "Search", helper: "Header search + /search page." },
      { key: "reviews", label: "Product reviews", helper: "Show review block on product pages." },
      { key: "cart", label: "Cart", helper: "Header cart icon + cart UI." },
      { key: "announcementBar", label: "Announcement bar", helper: "Top-of-page strip (configure under Announcement)." },
      { key: "comingSoonOverlay", label: "Coming-soon overlay", helper: "Emergency switch — replaces the homepage with the under-construction page." },
    ],
  },
];

export default function ModulesPage() {
  const toast = useToast();
  const [modules, setModules] = useState<Modules | null>(null);
  const [snap, setSnap] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/sysuser/modules")
      .then((r) => r.json())
      .then((j) => {
        setModules(j.modules);
        setSnap(JSON.stringify(j.modules));
      });
  }, []);

  const dirty = modules ? JSON.stringify(modules) !== snap : false;
  useUnsavedGuard(dirty);

  if (!modules) return <div className="opacity-60">Loading…</div>;

  const set = (key: keyof Modules, value: boolean) => {
    setModules({ ...modules, [key]: value });
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/sysuser/modules", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modules),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Save failed");
      return;
    }
    setSnap(JSON.stringify(modules));
    toast.success("Modules updated", "Public site reflects within ~60s.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Workspace" }, { label: "Modules" }]}
        title="Modules"
        description="Turn site sections on or off without touching code."
        actions={
          <Button onClick={save} loading={saving} disabled={!dirty}>
            Save
          </Button>
        }
      />

      <div className="space-y-6">
        {GROUPS.map((group) => (
          <Card
            key={group.title}
            title={group.title}
            description={group.description}
          >
            <div className="space-y-3">
              {group.modules.map((m) => (
                <div
                  key={m.key}
                  className="flex items-start justify-between gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-base)] p-3"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.label}</div>
                    <div className="text-xs opacity-60">{m.helper}</div>
                  </div>
                  <Switch
                    checked={modules[m.key]}
                    onChange={(v) => set(m.key, v)}
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <StickySaveBar visible={dirty} saving={saving} onSave={save} />
    </div>
  );
}
