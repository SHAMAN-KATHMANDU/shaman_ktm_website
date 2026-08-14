"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { Tabs, TabList, Tab } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { formatNpr } from "@/lib/format";

interface SaleRow {
  id: string;
  saleNo: string;
  channel: string;
  status: string;
  dateAd: string;
  dateBs: string;
  totalAmount: number;
  reversesSaleId: string | null;
  showroom: { key: string; name: string } | null;
  paymentMethod: { id: string; label: string } | null;
  enteredByStaff: { id: string; name: string } | null;
  crmLead: { id: string; name: string } | null;
  staff: { role: string; staff: { id: string; name: string } }[];
  _count: { lines: number };
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
  status: string;
  variations: {
    id: string;
    sku: string;
    price: number;
    label: string | null;
    active: boolean;
  }[];
}

interface DraftLine {
  productId: string;
  variationId: string;
  qty: number;
  unitPrice: number;
  lineDiscount: number;
  productName: string;
  variantLabel: string;
}

const CHANNELS = [
  { value: "showroom", label: "Showroom" },
  { value: "online", label: "Online" },
  { value: "wholesale_b2b", label: "Wholesale / B2B" },
  { value: "event", label: "Event" },
];

const STATUS_TONE: Record<string, "neutral" | "gold" | "success" | "danger" | "muted"> = {
  draft: "muted",
  confirmed: "success",
  void: "danger",
};

export default function SalesPage() {
  const toast = useToast();
  const [status, setStatus] = useState<"all" | "draft" | "confirmed" | "void">("all");
  const [channel, setChannel] = useState("");
  const [showroomKey, setShowroomKey] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [rows, setRows] = useState<SaleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [netRevenue, setNetRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showrooms, setShowrooms] = useState<{ key: string; name: string }[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<
    { id: string; label: string }[]
  >([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    channel: "showroom",
    showroomKey: "",
    paymentMethodId: "",
    paymentRef: "",
    soldByStaffId: "",
    discountAmount: "",
    deliveryFee: "",
    notes: "",
  });
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [lineDraft, setLineDraft] = useState({
    productId: "",
    variationId: "",
    qty: "1",
    unitPrice: "",
    lineDiscount: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status !== "all") qs.set("status", status);
    if (channel) qs.set("channel", channel);
    if (showroomKey) qs.set("showroomKey", showroomKey);
    const j = await fetch(`/api/sysuser/sales?${qs}`).then((r) => r.json());
    setRows(j.sales ?? []);
    setTotal(j.total ?? 0);
    setNetRevenue(j.netRevenue ?? 0);
    setLoading(false);
  }, [status, channel, showroomKey, page, limit]);

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
    fetch("/api/sysuser/payment-methods")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setPaymentMethods(j?.paymentMethods ?? []))
      .catch(() => setPaymentMethods([]));
    fetch("/api/sysuser/staff?active=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setStaff(j?.staff ?? []))
      .catch(() => setStaff([]));
  }, []);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === lineDraft.productId),
    [products, lineDraft.productId],
  );

  const draftSubtotal = lines.reduce(
    (sum, l) => sum + l.unitPrice * l.qty - l.lineDiscount,
    0,
  );
  const draftTotal =
    draftSubtotal -
    (Number(form.discountAmount) || 0) +
    (Number(form.deliveryFee) || 0);

  const addLine = () => {
    const product = products.find((p) => p.id === lineDraft.productId);
    if (!product) {
      toast.error("Pick a product");
      return;
    }
    const variation = product.variations.find((v) => v.id === lineDraft.variationId);
    if (product.variations.length > 0 && !variation) {
      toast.error("Pick a variation — stock is tracked per variation");
      return;
    }
    const qty = Number(lineDraft.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      toast.error("Quantity must be a whole number of at least 1");
      return;
    }
    setLines([
      ...lines,
      {
        productId: product.id,
        variationId: variation?.id ?? "",
        qty,
        unitPrice:
          Number(lineDraft.unitPrice) || variation?.price || product.price,
        lineDiscount: Number(lineDraft.lineDiscount) || 0,
        productName: product.name,
        variantLabel: variation?.label ?? variation?.sku ?? "",
      },
    ]);
    setLineDraft({
      productId: "",
      variationId: "",
      qty: "1",
      unitPrice: "",
      lineDiscount: "",
    });
  };

  const save = async () => {
    if (lines.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/sysuser/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: form.channel,
        showroomKey: form.showroomKey || null,
        paymentMethodId: form.paymentMethodId || null,
        paymentRef: form.paymentRef.trim() || null,
        discountAmount: Number(form.discountAmount) || undefined,
        deliveryFee: Number(form.deliveryFee) || undefined,
        notes: form.notes.trim() || null,
        lines: lines.map((l) => ({
          productId: l.productId,
          variationId: l.variationId || null,
          qty: l.qty,
          unitPrice: l.unitPrice,
          lineDiscount: l.lineDiscount || undefined,
        })),
        staff: form.soldByStaffId
          ? [{ staffId: form.soldByStaffId, role: "sold_by" }]
          : undefined,
      }),
    });
    setSaving(false);
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(j?.message ?? "Could not save the sale");
      return;
    }
    toast.success("Draft saved — confirm it to move stock");
    setDialogOpen(false);
    setLines([]);
    setForm({
      channel: "showroom",
      showroomKey: "",
      paymentMethodId: "",
      paymentRef: "",
      soldByStaffId: "",
      discountAmount: "",
      deliveryFee: "",
      notes: "",
    });
    load();
  };

  const columns: Column<SaleRow>[] = [
    {
      key: "saleNo",
      header: "Sale",
      render: (r) => (
        <Link href={`/sysuser/sales/${r.id}`} className="block hover:underline">
          <div className="font-medium">
            {r.status === "draft" ? "(draft)" : r.saleNo}
          </div>
          <div className="text-xs text-ink-soft">
            {r.dateBs} · {r._count.lines} item{r._count.lines === 1 ? "" : "s"}
          </div>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <div className="flex flex-col gap-1">
          <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
          {r.reversesSaleId && (
            <span className="text-[10px] uppercase tracking-wider text-ink-soft">
              reversal
            </span>
          )}
        </div>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      render: (r) => CHANNELS.find((c) => c.value === r.channel)?.label ?? r.channel,
    },
    {
      key: "showroom",
      header: "Showroom",
      render: (r) => r.showroom?.name ?? <span className="text-xs text-ink-soft">—</span>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      render: (r) => (
        <span className={r.totalAmount < 0 ? "text-rakta" : ""}>
          {formatNpr(r.totalAmount)}
        </span>
      ),
    },
    {
      key: "payment",
      header: "Payment",
      render: (r) =>
        r.paymentMethod?.label ?? <span className="text-xs text-ink-soft">—</span>,
    },
    {
      key: "who",
      header: "Recorded by",
      render: (r) => (
        <div className="text-xs text-ink-soft">
          {r.enteredByStaff?.name ?? "system"}
          {r.staff.length > 0 && (
            <div>
              sold by {r.staff.filter((s) => s.role === "sold_by").map((s) => s.staff.name).join(", ") || "—"}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Operations" }, { label: "Sales" }]}
        title="Sales"
        description="Every channel in one spine. A draft holds no stock — confirming decrements one showroom's pool and makes the sale immutable."
        actions={
          <Button icon={<Plus size={14} />} onClick={() => setDialogOpen(true)}>
            New sale
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2 p-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-soft">
              Net revenue (filtered)
            </div>
            <div className="font-display text-2xl">{formatNpr(netRevenue)}</div>
          </div>
          <p className="max-w-md text-xs text-ink-soft">
            Sums every non-draft sale. A voided sale keeps its amount in the month
            it happened; its reversal carries the negative into the month the
            correction was made, so closed months don&apos;t change.
          </p>
        </div>
      </Card>

      <Tabs
        defaultValue="all"
        value={status}
        onValueChange={(v) => {
          setStatus(v as typeof status);
          setPage(1);
        }}
      >
        <TabList>
          <Tab value="all">All</Tab>
          <Tab value="draft">Drafts</Tab>
          <Tab value="confirmed">Confirmed</Tab>
          <Tab value="void">Void</Tab>
        </TabList>
      </Tabs>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[11rem]">
          <Field label="Channel">
            <Select
              value={channel}
              onChange={(v) => {
                setChannel(v);
                setPage(1);
              }}
              options={[{ value: "", label: "All channels" }, ...CHANNELS]}
            />
          </Field>
        </div>
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
      </div>

      <Card>
        {loading ? (
          <div className="p-6 text-sm text-ink-soft">Loading…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No sales here"
            description="Record a sale, or widen the filters."
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
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="New sale"
        description="Saved as a draft. Nothing leaves stock until you confirm it."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save draft"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Channel" required>
              <Select
                value={form.channel}
                onChange={(v) => setForm({ ...form, channel: v })}
                options={CHANNELS}
              />
            </Field>
            <Field
              label="Showroom"
              hint="Which pool the stock comes from. Leave blank to use your default."
            >
              <Select
                value={form.showroomKey}
                onChange={(v) => setForm({ ...form, showroomKey: v })}
                options={[
                  { value: "", label: "— My default —" },
                  ...showrooms.map((s) => ({ value: s.key, label: s.name })),
                ]}
              />
            </Field>
          </div>

          <div className="rounded-card border border-line p-3">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-soft">
              Items
            </div>
            {lines.length > 0 && (
              <ul className="mb-3 divide-y divide-line">
                {lines.map((l, i) => (
                  <li key={i} className="flex items-center gap-2 py-2 text-sm">
                    <span className="flex-1">
                      {l.productName}
                      {l.variantLabel ? ` · ${l.variantLabel}` : ""}
                      <span className="text-ink-soft">
                        {" "}
                        × {l.qty} @ {formatNpr(l.unitPrice)}
                        {l.lineDiscount ? ` − ${formatNpr(l.lineDiscount)}` : ""}
                      </span>
                    </span>
                    <span>{formatNpr(l.unitPrice * l.qty - l.lineDiscount)}</span>
                    <button
                      type="button"
                      onClick={() => setLines(lines.filter((_, j) => j !== i))}
                      className="rounded p-1 opacity-60 hover:opacity-100"
                      aria-label="Remove item"
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
                  value={lineDraft.productId}
                  onChange={(v) =>
                    setLineDraft({ ...lineDraft, productId: v, variationId: "" })
                  }
                  options={products
                    .filter((p) => p.status !== "archived")
                    .map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Select product…"
                  searchable
                />
              </Field>
              <Field label="Variation">
                <Select
                  value={lineDraft.variationId}
                  onChange={(v) => setLineDraft({ ...lineDraft, variationId: v })}
                  options={(selectedProduct?.variations ?? [])
                    .filter((v) => v.active !== false)
                    .map((v) => ({
                      value: v.id,
                      label: `${v.label ?? v.sku} — ${formatNpr(v.price)}`,
                    }))}
                  placeholder={
                    selectedProduct
                      ? selectedProduct.variations.length
                        ? "Select variation…"
                        : "No variations"
                      : "Pick a product first"
                  }
                  disabled={!selectedProduct?.variations.length}
                />
              </Field>
              <Field label="Qty">
                <TextInput
                  value={lineDraft.qty}
                  onChange={(e) => setLineDraft({ ...lineDraft, qty: e.target.value })}
                />
              </Field>
              <Field label="Unit price" hint="Blank = catalog price">
                <TextInput
                  value={lineDraft.unitPrice}
                  onChange={(e) =>
                    setLineDraft({ ...lineDraft, unitPrice: e.target.value })
                  }
                  placeholder={
                    selectedProduct
                      ? String(
                          selectedProduct.variations.find(
                            (v) => v.id === lineDraft.variationId,
                          )?.price ?? selectedProduct.price,
                        )
                      : ""
                  }
                />
              </Field>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2"
              icon={<Plus size={14} />}
              onClick={addLine}
            >
              Add item
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Sale discount">
              <TextInput
                value={form.discountAmount}
                onChange={(e) =>
                  setForm({ ...form, discountAmount: e.target.value })
                }
                placeholder="0"
              />
            </Field>
            <Field label="Delivery fee">
              <TextInput
                value={form.deliveryFee}
                onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })}
                placeholder="0"
              />
            </Field>
            <Field label="Total">
              <div className="rounded-card border border-line px-3 py-2 text-sm">
                {formatNpr(draftTotal)}
              </div>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Payment method">
              <Select
                value={form.paymentMethodId}
                onChange={(v) => setForm({ ...form, paymentMethodId: v })}
                options={[
                  { value: "", label: "— Not recorded yet —" },
                  ...paymentMethods.map((m) => ({ value: m.id, label: m.label })),
                ]}
              />
            </Field>
            <Field label="Payment reference">
              <TextInput
                value={form.paymentRef}
                onChange={(e) => setForm({ ...form, paymentRef: e.target.value })}
                placeholder="Receipt / transaction no."
              />
            </Field>
          </div>

          <Field label="Sold by">
            <Select
              value={form.soldByStaffId}
              onChange={(v) => setForm({ ...form, soldByStaffId: v })}
              options={[
                { value: "", label: "— Just me —" },
                ...staff.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>

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
