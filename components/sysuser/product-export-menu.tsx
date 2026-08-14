"use client";

// Export dropdown for the admin products page. Clicking "Export" opens a small
// panel where the admin picks any combination of filters (status, category,
// element, featured/new) and downloads a matching .xlsx. With everything left
// on "All" and no flags ticked, it exports the whole catalog.
//
// The download is a plain navigation to /api/sysuser/products/export?<filters>,
// which streams back the file as an attachment (see that route + the workbook
// builder in lib/cms/product-export.ts).

import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";

interface CategoryRow {
  id: string;
  name: string;
  _count?: { products: number };
}
interface ElementRow {
  slug: string;
  name?: string | null;
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: "all", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

export function ProductExportMenu({ search }: { search?: string }) {
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const [status, setStatus] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const [element, setElement] = useState("all");
  const [featured, setFeatured] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [photos, setPhotos] = useState(true);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [elements, setElements] = useState<ElementRow[]>([]);
  const [metaLoaded, setMetaLoaded] = useState(false);

  // Load categories + elements once, the first time the panel opens.
  useEffect(() => {
    if (!open || metaLoaded) return;
    (async () => {
      try {
        const [c, e] = await Promise.all([
          fetch("/api/sysuser/categories").then((r) => r.json()),
          fetch("/api/sysuser/elements").then((r) => r.json()),
        ]);
        setCategories(c.categories ?? []);
        setElements(e.elements ?? []);
      } catch {
        // Non-fatal — the export still works with "All" selections.
      } finally {
        setMetaLoaded(true);
      }
    })();
  }, [open, metaLoaded]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const categoryOptions: SelectOption[] = [
    { value: "all", label: "All categories" },
    ...categories.map((c) => ({
      value: c.id,
      label: c._count ? `${c.name} (${c._count.products})` : c.name,
    })),
  ];
  const elementOptions: SelectOption[] = [
    { value: "all", label: "All elements" },
    ...elements.map((e) => ({ value: e.slug, label: e.name || e.slug })),
  ];

  const activeCount =
    (status !== "all" ? 1 : 0) +
    (categoryId !== "all" ? 1 : 0) +
    (element !== "all" ? 1 : 0) +
    (featured ? 1 : 0) +
    (isNew ? 1 : 0);

  const download = () => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status !== "all") params.set("status", status);
    if (categoryId !== "all") params.set("categoryId", categoryId);
    if (element !== "all") params.set("element", element);
    if (featured) params.set("featured", "1");
    if (isNew) params.set("isNew", "1");
    if (!photos) params.set("photos", "0");
    const qs = params.toString();
    toast.success("Preparing export…", "Your download will start shortly.");
    setOpen(false);
    window.location.href = `/api/sysuser/products/export${qs ? `?${qs}` : ""}`;
  };

  const reset = () => {
    setStatus("all");
    setCategoryId("all");
    setElement("all");
    setFeatured(false);
    setIsNew(false);
    setPhotos(true);
  };

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="secondary"
        icon={<Download size={12} />}
        iconRight={<ChevronDown size={12} />}
        onClick={() => setOpen((o) => !o)}
      >
        Export{activeCount > 0 ? ` (${activeCount})` : ""}
      </Button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-card border border-line bg-bone p-4 shadow-card">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide opacity-60">
            Export to Excel
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs opacity-70">Status</label>
              <Select
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs opacity-70">Category</label>
              <Select
                value={categoryId}
                onChange={setCategoryId}
                options={categoryOptions}
                searchable
                placeholder={metaLoaded ? "All categories" : "Loading…"}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs opacity-70">Element</label>
              <Select
                value={element}
                onChange={setElement}
                options={elementOptions}
                placeholder={metaLoaded ? "All elements" : "Loading…"}
              />
            </div>

            <div className="space-y-2 pt-1">
              <Checkbox
                checked={featured}
                onChange={setFeatured}
                label="Featured only"
              />
              <Checkbox
                checked={isNew}
                onChange={setIsNew}
                label="New releases only"
              />
            </div>

            <div className="border-t border-line pt-3">
              <Checkbox
                checked={photos}
                onChange={setPhotos}
                label="Include product photos"
                description={
                  photos
                    ? "Embeds each product's photo. Slower on large catalogs."
                    : "Data only — downloads instantly, even for 1000s of products."
                }
              />
            </div>

            {search ? (
              <div className="rounded-input border border-line bg-surface px-2 py-1.5 text-xs text-ink-soft">
                Also filtering by search: “{search}”
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button size="sm" variant="ghost" onClick={reset}>
              Reset
            </Button>
            <Button
              size="sm"
              icon={<Download size={12} />}
              onClick={download}
            >
              Download Excel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
