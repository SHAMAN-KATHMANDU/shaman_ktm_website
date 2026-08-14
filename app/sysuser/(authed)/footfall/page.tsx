"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextInput, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";

interface InquiryRow {
  id: string;
  inquiryType: string;
  freeTextProduct: string | null;
  variationId: string | null;
  variation: { sku: string; label: string | null; product: { name: string } } | null;
}

interface FootfallRow {
  id: string;
  dateAd: string;
  dateBs: string;
  showroomKey: string;
  visitorsTotal: number;
  individuals: number | null;
  groups: number | null;
  source: string;
  convertedToSale: boolean;
  notes: string | null;
  showroom: { key: string; name: string };
  enteredByStaff: { id: string; name: string };
  inquiries: InquiryRow[];
}

const SOURCES = [
  { value: "walk_in", label: "Walk-in" },
  { value: "ad", label: "From an ad" },
  { value: "referral", label: "Referral" },
  { value: "event", label: "Event" },
  { value: "passing", label: "Passing by" },
];

interface DraftInquiry {
  variationId: string;
  freeTextProduct: string;
  inquiryType: string;
  label: string;
}

export default function FootfallPage() {
  const toast = useToast();
  const [showroomKey, setShowroomKey] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [rows, setRows] = useState<FootfallRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    visitorsTotal: 0,
    convertedEntries: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showrooms, setShowrooms] = useState<{ key: string; name: string }[]>([]);
  const [products, setProducts] = useState<
    { id: string; name: string; variations: { id: string; sku: string; label: string | null }[] }[]
  >([]);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    showroomKey: "",
    visitorsTotal: "1",
    individuals: "",
    groups: "",
    source: "walk_in",
    notes: "",
  });
  const [inquiries, setInquiries] = useState<DraftInquiry[]>([]);
  const [inqDraft, setInqDraft] = useState({
    productId: "",
    variationId: "",
    freeText: "",
    inquiryType: "inquired",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (showroomKey) qs.set("showroomKey", showroomKey);
    if (source) qs.set("source", source);
    const j = await fetch(`/api/sysuser/footfall?${qs}`).then((r) => r.json());
    setRows(j.entries ?? []);
    setTotal(j.total ?? 0);
    setStats({
      visitorsTotal: j.visitorsTotal ?? 0,
      convertedEntries: j.convertedEntries ?? 0,
      conversionRate: j.conversionRate ?? 0,
    });
    setLoading(false);
  }, [showroomKey, source, page, limit]);

  useEffect(() => {
    // load() flips the loading flag before fetching — that's the spinner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/sysuser/showrooms")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setShowrooms(j?.showrooms ?? []))
      .catch(() => setShowrooms([]));
    fetch("/api/sysuser/products")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setProducts(j?.products ?? []))
      .catch(() => setProducts([]));
  }, []);

  const addInquiry = () => {
    const product = products.find((p) => p.id === inqDraft.productId);
    const variation = product?.variations.find((v) => v.id === inqDraft.variationId);
    const free = inqDraft.freeText.trim();
    if (!variation && !free) {
      toast.error("Pick a product or type what they asked about");
      return;
    }
    setInquiries([
      ...inquiries,
      {
        variationId: variation?.id ?? "",
        freeTextProduct: variation ? "" : free,
        inquiryType: inqDraft.inquiryType,
        label: variation
          ? `${product?.name} · ${variation.label ?? variation.sku}`
          : free,
      },
    ]);
    setInqDraft({ productId: "", variationId: "", freeText: "", inquiryType: "inquired" });
  };

  const save = async () => {
    const visitorsTotal = Number(form.visitorsTotal);
    if (!Number.isInteger(visitorsTotal) || visitorsTotal < 0) {
      toast.error("Visitors must be a whole number");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/sysuser/footfall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        showroomKey: form.showroomKey || undefined,
        visitorsTotal,
        individuals: form.individuals ? Number(form.individuals) : null,
        groups: form.groups ? Number(form.groups) : null,
        source: form.source,
        notes: form.notes.trim() || null,
        inquiries: inquiries.map((q) => ({
          variationId: q.variationId || null,
          freeTextProduct: q.freeTextProduct || null,
          inquiryType: q.inquiryType,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Could not save the entry");
      return;
    }
    toast.success("Footfall recorded");
    setOpen(false);
    setInquiries([]);
    setForm({
      showroomKey: "",
      visitorsTotal: "1",
      individuals: "",
      groups: "",
      source: "walk_in",
      notes: "",
    });
    load();
  };

  const selectedProduct = products.find((p) => p.id === inqDraft.productId);

  const columns: Column<FootfallRow>[] = [
    {
      key: "date",
      header: "Date",
      render: (r) => (
        <div>
          <div>{r.dateBs}</div>
          <div className="text-xs text-ink-soft">
            {new Date(r.dateAd).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    { key: "showroom", header: "Showroom", render: (r) => r.showroom.name },
    {
      key: "visitors",
      header: "Visitors",
      align: "right",
      render: (r) => (
        <div>
          <div>{r.visitorsTotal}</div>
          {(r.individuals != null || r.groups != null) && (
            <div className="text-xs text-ink-soft">
              {r.individuals != null ? `${r.individuals} indiv` : ""}
              {r.individuals != null && r.groups != null ? " · " : ""}
              {r.groups != null ? `${r.groups} grp` : ""}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      render: (r) => SOURCES.find((s) => s.value === r.source)?.label ?? r.source,
    },
    {
      key: "inquiries",
      header: "Asked about",
      render: (r) =>
        r.inquiries.length === 0 ? (
          <span className="text-xs text-ink-soft">—</span>
        ) : (
          <ul className="space-y-0.5 text-xs">
            {r.inquiries.map((q) => (
              <li key={q.id}>
                {q.variation
                  ? `${q.variation.product.name} · ${q.variation.label ?? q.variation.sku}`
                  : q.freeTextProduct}
                <Badge tone={q.inquiryType === "sold" ? "success" : "muted"} className="ml-1">
                  {q.inquiryType}
                </Badge>
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: "converted",
      header: "Converted",
      render: (r) =>
        r.convertedToSale ? <Badge tone="success">yes</Badge> : <span className="text-xs text-ink-soft">no</span>,
    },
    {
      key: "by",
      header: "Recorded by",
      render: (r) => <span className="text-xs text-ink-soft">{r.enteredByStaff.name}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Operations" }, { label: "Footfall" }]}
        title="Showroom footfall"
        description="Who came in, what they asked about, and whether it turned into a sale. A busy day is one entry with several inquiries — no more continuation rows."
        actions={
          <Button icon={<Plus size={14} />} onClick={() => setOpen(true)}>
            Record footfall
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Visitors (filtered)", value: stats.visitorsTotal },
          { label: "Entries that converted", value: stats.convertedEntries },
          { label: "Conversion rate", value: `${stats.conversionRate}%` },
        ].map((s) => (
          <Card key={s.label}>
            <div className="p-4">
              <div className="text-[10px] uppercase tracking-wider text-ink-soft">
                {s.label}
              </div>
              <div className="font-display text-2xl">{s.value}</div>
            </div>
          </Card>
        ))}
      </div>
      <p className="-mt-3 text-xs text-ink-soft">
        Conversion is per entry, not per visitor — a group of four is one entry
        and at most one conversion.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[11rem]">
          <Field label="Showroom">
            <Select
              value={showroomKey}
              onChange={(v) => {
                setShowroomKey(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "All showrooms" },
                ...showrooms.map((s) => ({ value: s.key, label: s.name })),
              ]}
            />
          </Field>
        </div>
        <div className="min-w-[11rem]">
          <Field label="Source">
            <Select
              value={source}
              onChange={(v) => {
                setSource(v);
                setPage(1);
              }}
              options={[{ value: "", label: "Any source" }, ...SOURCES]}
            />
          </Field>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="p-6 text-sm text-ink-soft">Loading…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No footfall recorded here"
            description="Record a day, or widen the filters."
          />
        ) : (
          <>
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
            <Pagination
              page={page}
              pageSize={limit}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(n) => {
                setLimit(n);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Record footfall"
        description="One entry per visit. Add an inquiry for each thing they asked about."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save entry"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Showroom" hint="Blank uses your default.">
              <Select
                value={form.showroomKey}
                onChange={(v) => setForm({ ...form, showroomKey: v })}
                options={[
                  { value: "", label: "— My default —" },
                  ...showrooms.map((s) => ({ value: s.key, label: s.name })),
                ]}
              />
            </Field>
            <Field label="Source" required>
              <Select
                value={form.source}
                onChange={(v) => setForm({ ...form, source: v })}
                options={SOURCES}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Visitors" required>
              <TextInput
                value={form.visitorsTotal}
                onChange={(e) => setForm({ ...form, visitorsTotal: e.target.value })}
              />
            </Field>
            <Field label="Individuals" hint="Optional">
              <TextInput
                value={form.individuals}
                onChange={(e) => setForm({ ...form, individuals: e.target.value })}
              />
            </Field>
            <Field label="Groups" hint="Optional">
              <TextInput
                value={form.groups}
                onChange={(e) => setForm({ ...form, groups: e.target.value })}
              />
            </Field>
          </div>

          <div className="rounded-card border border-line p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
              Asked about
            </div>
            {inquiries.length > 0 && (
              <ul className="mb-3 divide-y divide-line">
                {inquiries.map((q, i) => (
                  <li key={i} className="flex items-center gap-2 py-2 text-sm">
                    <span className="flex-1">{q.label}</span>
                    <Badge tone={q.inquiryType === "sold" ? "success" : "muted"}>
                      {q.inquiryType}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => setInquiries(inquiries.filter((_, j) => j !== i))}
                      className="rounded p-1 opacity-60 hover:opacity-100"
                      aria-label="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Product">
                <Select
                  value={inqDraft.productId}
                  onChange={(v) =>
                    setInqDraft({ ...inqDraft, productId: v, variationId: "" })
                  }
                  options={products.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="From the catalog…"
                  searchable
                />
              </Field>
              <Field label="Variation">
                <Select
                  value={inqDraft.variationId}
                  onChange={(v) => setInqDraft({ ...inqDraft, variationId: v })}
                  options={(selectedProduct?.variations ?? []).map((v) => ({
                    value: v.id,
                    label: v.label ?? v.sku,
                  }))}
                  placeholder={selectedProduct ? "Select…" : "Pick a product first"}
                  disabled={!selectedProduct?.variations.length}
                />
              </Field>
              <Field
                label="…or type it"
                hint="For things not in the catalog yet."
              >
                <TextInput
                  value={inqDraft.freeText}
                  onChange={(e) => setInqDraft({ ...inqDraft, freeText: e.target.value })}
                  placeholder="big brass bowl"
                />
              </Field>
              <Field label="Outcome">
                <Select
                  value={inqDraft.inquiryType}
                  onChange={(v) => setInqDraft({ ...inqDraft, inquiryType: v })}
                  options={[
                    { value: "inquired", label: "Inquired" },
                    { value: "sold", label: "Sold" },
                  ]}
                />
              </Field>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              icon={<Plus size={14} />}
              onClick={addInquiry}
            >
              Add inquiry
            </Button>
          </div>

          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
