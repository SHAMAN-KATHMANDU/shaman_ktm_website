"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Ban, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field, TextInput, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { formatNpr } from "@/lib/format";

interface LineRow {
  id: string;
  productId: string;
  variationId: string | null;
  productName: string;
  variantLabel: string | null;
  sku: string | null;
  qty: number;
  unitMrp: number | null;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  note: string | null;
}

interface SaleDetail {
  id: string;
  saleNo: string;
  channel: string;
  status: string;
  dateAd: string;
  dateBs: string;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  totalAmount: number;
  paymentRef: string | null;
  paymentEvidenceUrl: string | null;
  inputSource: string;
  enteredAt: string;
  confirmedAt: string | null;
  voidedAt: string | null;
  notes: string | null;
  showroomKey: string | null;
  showroom: { key: string; name: string } | null;
  paymentMethod: { id: string; label: string; channel: string } | null;
  enteredByStaff: { id: string; name: string } | null;
  crmLead: { id: string; name: string; status: string } | null;
  customer: { id: string; name: string; email: string } | null;
  orderId: string | null;
  reverses: { id: string; saleNo: string } | null;
  reversedBy: { id: string; saleNo: string } | null;
  staff: { role: string; staff: { id: string; name: string } }[];
  lines: LineRow[];
}

const STATUS_TONE: Record<string, "neutral" | "gold" | "success" | "danger" | "muted"> = {
  draft: "muted",
  confirmed: "success",
  void: "danger",
};

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showrooms, setShowrooms] = useState<{ key: string; name: string }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<
    { id: string; label: string }[]
  >([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmForm, setConfirmForm] = useState({
    showroomKey: "",
    paymentMethodId: "",
    paymentRef: "",
    closeCrmLead: true,
  });
  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/sysuser/sales/${params.id}`);
    const j = await res.json().catch(() => null);
    setSale(res.ok ? (j?.sale ?? null) : null);
    setLoading(false);
  }, [params.id]);

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
    fetch("/api/sysuser/payment-methods")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setPaymentMethods(j?.paymentMethods ?? []))
      .catch(() => setPaymentMethods([]));
  }, []);

  const confirm = async () => {
    setSaving(true);
    const res = await fetch(`/api/sysuser/sales/${params.id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        showroomKey: confirmForm.showroomKey || null,
        paymentMethodId: confirmForm.paymentMethodId || null,
        paymentRef: confirmForm.paymentRef.trim() || null,
        closeCrmLead: confirmForm.closeCrmLead,
      }),
    });
    setSaving(false);
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(j?.message ?? "Could not confirm the sale");
      return;
    }
    toast.success(`Confirmed ${j.sale.saleNo} — stock decremented`);
    setConfirmOpen(false);
    load();
  };

  const voidIt = async () => {
    if (!voidReason.trim()) {
      toast.error("A reason is required — it goes on the reversing sale");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/sysuser/sales/${params.id}/void`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: voidReason.trim() }),
    });
    setSaving(false);
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(j?.message ?? "Could not void the sale");
      return;
    }
    toast.success(`Voided — reversal ${j.reversal.saleNo} created, stock restored`);
    setVoidOpen(false);
    setVoidReason("");
    load();
  };

  const discard = async () => {
    setSaving(true);
    const res = await fetch(`/api/sysuser/sales/${params.id}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Could not discard the draft");
      return;
    }
    toast.success("Draft discarded");
    router.push("/sysuser/sales");
  };

  if (loading) return <div className="p-6 text-sm opacity-60">Loading…</div>;
  if (!sale) {
    return (
      <div className="space-y-4">
        <Link
          href="/sysuser/sales"
          className="inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
        >
          <ArrowLeft size={14} /> Back to sales
        </Link>
        <Card>
          <div className="p-6 text-sm opacity-70">This sale no longer exists.</div>
        </Card>
      </div>
    );
  }

  const isDraft = sale.status === "draft";
  const isConfirmed = sale.status === "confirmed";
  const isReversal = !!sale.reverses;

  const lineColumns: Column<LineRow>[] = [
    {
      key: "item",
      header: "Item",
      render: (l) => (
        <div>
          <div className="font-medium">{l.productName}</div>
          <div className="text-xs opacity-60">
            {[l.variantLabel, l.sku].filter(Boolean).join(" · ")}
          </div>
        </div>
      ),
    },
    { key: "qty", header: "Qty", align: "right", render: (l) => l.qty },
    {
      key: "mrp",
      header: "MRP",
      align: "right",
      render: (l) =>
        l.unitMrp ? (
          <span className="opacity-60">{formatNpr(l.unitMrp)}</span>
        ) : (
          <span className="text-xs opacity-40">—</span>
        ),
    },
    {
      key: "unit",
      header: "Unit price",
      align: "right",
      render: (l) => formatNpr(l.unitPrice),
    },
    {
      key: "discount",
      header: "Discount",
      align: "right",
      render: (l) => (l.lineDiscount ? formatNpr(l.lineDiscount) : "—"),
    },
    {
      key: "total",
      header: "Line total",
      align: "right",
      render: (l) => formatNpr(l.lineTotal),
    },
  ];

  const detail = (label: string, value: React.ReactNode) => (
    <div>
      <div className="text-[10px] uppercase tracking-wider opacity-50">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: "Operations" },
          { label: "Sales", href: "/sysuser/sales" },
          { label: isDraft ? "Draft" : sale.saleNo },
        ]}
        title={isDraft ? "Draft sale" : sale.saleNo}
        description={`${sale.dateBs} (${new Date(sale.dateAd).toLocaleDateString()}) · ${sale.channel}${sale.showroom ? ` · ${sale.showroom.name}` : ""}`}
        actions={
          <div className="flex gap-2">
            {isDraft && (
              <>
                <Button
                  variant="secondary"
                  icon={<Trash2 size={14} />}
                  onClick={discard}
                  disabled={saving}
                >
                  Discard
                </Button>
                <Button
                  icon={<Check size={14} />}
                  onClick={() => {
                    setConfirmForm({
                      showroomKey: sale.showroomKey ?? "",
                      paymentMethodId: sale.paymentMethod?.id ?? "",
                      paymentRef: sale.paymentRef ?? "",
                      closeCrmLead: true,
                    });
                    setConfirmOpen(true);
                  }}
                >
                  Confirm sale
                </Button>
              </>
            )}
            {isConfirmed && !isReversal && (
              <Button
                variant="secondary"
                icon={<Ban size={14} />}
                onClick={() => setVoidOpen(true)}
              >
                Void sale
              </Button>
            )}
          </div>
        }
      />

      {isConfirmed && !isReversal && (
        <Card>
          <p className="p-4 text-xs opacity-70">
            This sale is confirmed, so it can no longer be edited. Correcting it
            creates a reversing sale — the original keeps its figures in the month
            it happened, and the correction lands in today&apos;s.
          </p>
        </Card>
      )}
      {isReversal && sale.reverses && (
        <Card>
          <p className="p-4 text-sm">
            This is a reversal of{" "}
            <Link href={`/sysuser/sales/${sale.reverses.id}`} className="underline">
              {sale.reverses.saleNo}
            </Link>
            . Its amounts are negative on purpose, so a period sums to the
            corrected figure.
          </p>
        </Card>
      )}
      {sale.reversedBy && (
        <Card>
          <p className="p-4 text-sm">
            Voided by reversal{" "}
            <Link href={`/sysuser/sales/${sale.reversedBy.id}`} className="underline">
              {sale.reversedBy.saleNo}
            </Link>
            .
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <DataTable columns={lineColumns} rows={sale.lines} rowKey={(l) => l.id} />
          <div className="space-y-1 border-t border-[var(--color-border)] p-4 text-sm">
            <div className="flex justify-between">
              <span className="opacity-70">Subtotal</span>
              <span>{formatNpr(sale.subtotal)}</span>
            </div>
            {sale.discountAmount !== 0 && (
              <div className="flex justify-between">
                <span className="opacity-70">Sale discount</span>
                <span>−{formatNpr(Math.abs(sale.discountAmount))}</span>
              </div>
            )}
            {sale.deliveryFee !== 0 && (
              <div className="flex justify-between">
                <span className="opacity-70">Delivery</span>
                <span>{formatNpr(sale.deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--color-border)] pt-1 font-medium">
              <span>Total</span>
              <span>{formatNpr(sale.totalAmount)}</span>
            </div>
          </div>
        </Card>

        <Card>
          <div className="grid gap-4 p-4">
            {detail(
              "Status",
              <Badge tone={STATUS_TONE[sale.status] ?? "neutral"}>
                {sale.status}
              </Badge>,
            )}
            {detail("Payment", sale.paymentMethod?.label ?? "not recorded")}
            {sale.paymentRef && detail("Reference", sale.paymentRef)}
            {sale.paymentEvidenceUrl &&
              detail(
                "Evidence",
                <a
                  href={sale.paymentEvidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  View screenshot
                </a>,
              )}
            {detail("Recorded by", sale.enteredByStaff?.name ?? "system")}
            {detail("Entered via", sale.inputSource)}
            {detail("Entered at", new Date(sale.enteredAt).toLocaleString())}
            {sale.confirmedAt &&
              detail("Confirmed at", new Date(sale.confirmedAt).toLocaleString())}
            {sale.voidedAt &&
              detail("Voided at", new Date(sale.voidedAt).toLocaleString())}
            {sale.staff.length > 0 &&
              detail(
                "Staff",
                <ul className="space-y-0.5">
                  {sale.staff.map((s) => (
                    <li key={`${s.staff.id}-${s.role}`}>
                      {s.staff.name}{" "}
                      <span className="opacity-60">({s.role.replace("_", " ")})</span>
                    </li>
                  ))}
                </ul>,
              )}
            {sale.crmLead &&
              detail(
                "CRM lead",
                <Link href={`/sysuser/crm/${sale.crmLead.id}`} className="underline">
                  {sale.crmLead.name} ({sale.crmLead.status})
                </Link>,
              )}
            {sale.customer && detail("Customer", sale.customer.name)}
            {sale.orderId && detail("Website order", sale.orderId)}
          </div>
          {sale.notes && (
            <div className="border-t border-[var(--color-border)] p-4">
              <div className="text-[10px] uppercase tracking-wider opacity-50">
                Notes
              </div>
              <p className="whitespace-pre-wrap text-sm">{sale.notes}</p>
            </div>
          )}
        </Card>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm sale"
        description="This decrements the showroom's stock and locks the sale."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={saving}>
              {saving ? "Confirming…" : "Confirm"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-[var(--color-border)] p-3 text-sm">
            <div className="mb-1 text-[10px] uppercase tracking-wider opacity-50">
              Stock impact
            </div>
            <ul className="space-y-0.5">
              {sale.lines.map((l) => (
                <li key={l.id}>
                  {l.variationId ? (
                    <>
                      −{l.qty} × {l.productName}
                      {l.variantLabel ? ` (${l.variantLabel})` : ""}
                    </>
                  ) : (
                    <span className="opacity-60">
                      {l.productName} — no variation, so no pool to draw from
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <Field
            label="Showroom"
            required={!sale.showroomKey}
            hint="The pool this sale draws from."
          >
            <Select
              value={confirmForm.showroomKey}
              onChange={(v) => setConfirmForm({ ...confirmForm, showroomKey: v })}
              options={showrooms.map((s) => ({ value: s.key, label: s.name }))}
              placeholder="Select showroom…"
            />
          </Field>
          <Field label="Payment method">
            <Select
              value={confirmForm.paymentMethodId}
              onChange={(v) =>
                setConfirmForm({ ...confirmForm, paymentMethodId: v })
              }
              options={[
                { value: "", label: "— Unchanged —" },
                ...paymentMethods.map((m) => ({ value: m.id, label: m.label })),
              ]}
            />
          </Field>
          <Field label="Payment reference">
            <TextInput
              value={confirmForm.paymentRef}
              onChange={(e) =>
                setConfirmForm({ ...confirmForm, paymentRef: e.target.value })
              }
            />
          </Field>
          {sale.crmLead && (
            <Switch
              checked={confirmForm.closeCrmLead}
              onChange={(v) => setConfirmForm({ ...confirmForm, closeCrmLead: v })}
              label={`Mark ${sale.crmLead.name} as purchased`}
              description="Moves the linked lead to 'purchase' and records it in the lead's history."
            />
          )}
        </div>
      </Dialog>

      <Dialog
        open={voidOpen}
        onOpenChange={setVoidOpen}
        title="Void sale"
        description="Creates a reversing sale and puts the stock back. The original stays on record."
        footer={
          <>
            <Button variant="secondary" onClick={() => setVoidOpen(false)}>
              Cancel
            </Button>
            <Button onClick={voidIt} disabled={saving}>
              {saving ? "Voiding…" : "Void sale"}
            </Button>
          </>
        }
      >
        <Field label="Reason" required hint="Recorded on the reversing sale.">
          <Textarea
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            rows={3}
            placeholder="Wrong item scanned; customer returned everything."
          />
        </Field>
      </Dialog>
    </div>
  );
}
