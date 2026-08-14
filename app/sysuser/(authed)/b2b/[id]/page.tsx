"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BadgeDollarSign, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextInput, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { formatNpr } from "@/lib/format";

interface QuoteLine {
  id: string;
  productName: string;
  variantLabel: string | null;
  sku: string | null;
  qty: number;
  mrp: number;
  wholesaleRate: number;
  discountAmount: number;
  discountPct: number;
  lineTotalMrp: number;
  lineTotalWholesale: number;
  marginAmount: number | null;
  marginPct: number | null;
}

interface StageRow {
  id: string;
  fromStage: string | null;
  toStage: string;
  note: string | null;
  createdAt: string;
  changedByStaff: { id: string; name: string };
}

interface DealRow {
  id: string;
  dealName: string;
  stage: string;
  quoteAmount: number | null;
  expectedCloseDate: string | null;
  tierApplied: number | null;
  dateBs: string;
  notes: string | null;
  ownerStaff: { id: string; name: string } | null;
  tierData: { label: string; discountPct: number } | null;
  quoteLines: QuoteLine[];
  stageHistory: StageRow[];
}

interface PaymentRow {
  id: string;
  amount: number;
  isAdvance: boolean;
  reference: string | null;
  note: string | null;
  paidAt: string;
  dateBs: string;
  saleId: string | null;
  paymentMethod: { id: string; label: string } | null;
  recordedByStaff: { id: string; name: string };
}

interface AccountDetail {
  id: string;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  panNo: string | null;
  accountType: string;
  status: string;
  tier: number | null;
  notes: string | null;
  tierData: {
    label: string;
    discountPct: number;
    targetMarginPct: number;
    commissionPct: number;
    minOrderValue: number;
    maxOrderValue: number | null;
  } | null;
  ownerStaff: { id: string; name: string } | null;
  sourceCrmLead: { id: string; name: string; status: string } | null;
  deals: DealRow[];
  payments: PaymentRow[];
  sales: {
    id: string;
    saleNo: string;
    status: string;
    totalAmount: number;
    dateBs: string;
  }[];
  balance: { invoiced: number; paid: number; advances: number; outstanding: number };
}

const OPEN_STAGES = [
  "contacted",
  "meeting_set",
  "samples_sent",
  "quoted",
  "negotiating",
  "deferred",
] as const;
const ALL_STAGES = [...OPEN_STAGES, "won", "lost"] as const;
const CLOSED = ["won", "lost"];

const STAGE_TONE: Record<string, "neutral" | "gold" | "success" | "danger" | "muted"> = {
  contacted: "neutral",
  meeting_set: "neutral",
  samples_sent: "gold",
  quoted: "gold",
  negotiating: "gold",
  won: "success",
  lost: "danger",
  deferred: "muted",
};

const stageLabel = (s: string) => s.replace(/_/g, " ");

export default function B2bAccountPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [account, setAccount] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dealOpen, setDealOpen] = useState(false);
  const [dealForm, setDealForm] = useState({ dealName: "", notes: "" });
  const [stageOpen, setStageOpen] = useState<DealRow | null>(null);
  const [stageForm, setStageForm] = useState({
    toStage: "",
    note: "",
    linkedSaleId: "",
  });
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: "",
    isAdvance: false,
    paymentMethodId: "",
    reference: "",
    note: "",
  });
  const [paymentMethods, setPaymentMethods] = useState<
    { id: string; label: string }[]
  >([]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/sysuser/b2b/accounts/${params.id}`);
    const j = await res.json().catch(() => null);
    setAccount(res.ok ? (j?.account ?? null) : null);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    // load() flips the loading flag before fetching — that's the spinner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/sysuser/payment-methods")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setPaymentMethods(j?.paymentMethods ?? []))
      .catch(() => setPaymentMethods([]));
  }, []);

  const addDeal = async () => {
    if (!dealForm.dealName.trim()) {
      toast.error("Give the deal a name");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/sysuser/b2b/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        b2bAccountId: params.id,
        dealName: dealForm.dealName.trim(),
        notes: dealForm.notes.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Could not create the deal");
      return;
    }
    toast.success("Deal opened at 'contacted'");
    setDealOpen(false);
    setDealForm({ dealName: "", notes: "" });
    load();
  };

  const moveStage = async () => {
    if (!stageOpen || !stageForm.toStage) {
      toast.error("Pick a stage");
      return;
    }
    const isClosed = CLOSED.includes(stageOpen.stage);
    setSaving(true);
    const res = await fetch(`/api/sysuser/b2b/deals/${stageOpen.id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toStage: stageForm.toStage,
        note: stageForm.note.trim() || null,
        reopen: isClosed,
        // Only meaningful on a win; the API rejects it otherwise.
        ...(stageForm.toStage === "won" && stageForm.linkedSaleId
          ? { linkedSaleId: stageForm.linkedSaleId }
          : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Could not move the deal");
      return;
    }
    toast.success("Stage updated");
    setStageOpen(null);
    setStageForm({ toStage: "", note: "", linkedSaleId: "" });
    load();
  };

  const addPayment = async () => {
    const amount = Number(payForm.amount);
    if (!Number.isInteger(amount) || amount === 0) {
      toast.error("Amount must be a whole, non-zero number of rupees");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/sysuser/b2b/accounts/${params.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        isAdvance: payForm.isAdvance,
        paymentMethodId: payForm.paymentMethodId || null,
        reference: payForm.reference.trim() || null,
        note: payForm.note.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Could not record the payment");
      return;
    }
    toast.success("Payment recorded");
    setPayOpen(false);
    setPayForm({
      amount: "",
      isAdvance: false,
      paymentMethodId: "",
      reference: "",
      note: "",
    });
    load();
  };

  if (loading) return <div className="p-6 text-sm opacity-60">Loading…</div>;
  if (!account) {
    return (
      <div className="space-y-4">
        <Link
          href="/sysuser/b2b"
          className="inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
        >
          <ArrowLeft size={14} /> Back to accounts
        </Link>
        <Card>
          <div className="p-6 text-sm opacity-70">This account no longer exists.</div>
        </Card>
      </div>
    );
  }

  const b = account.balance;

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: "Operations" },
          { label: "B2B", href: "/sysuser/b2b" },
          { label: account.companyName },
        ]}
        title={account.companyName}
        description={
          [account.contactPerson, account.phone, account.email]
            .filter(Boolean)
            .join(" · ") || account.accountType
        }
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<BadgeDollarSign size={14} />}
              onClick={() => setPayOpen(true)}
            >
              Record payment
            </Button>
            <Button icon={<Plus size={14} />} onClick={() => setDealOpen(true)}>
              New deal
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Invoiced", value: formatNpr(b.invoiced) },
          { label: "Received", value: formatNpr(b.paid) },
          { label: "of which advance", value: formatNpr(b.advances) },
          {
            label: "Outstanding",
            value:
              b.outstanding === 0
                ? "settled"
                : b.outstanding > 0
                  ? formatNpr(b.outstanding)
                  : `${formatNpr(Math.abs(b.outstanding))} in credit`,
          },
        ].map((s) => (
          <Card key={s.label}>
            <div className="p-4">
              <div className="text-[10px] uppercase tracking-wider opacity-50">
                {s.label}
              </div>
              <div className="font-display text-xl">{s.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="grid gap-4 p-4 sm:grid-cols-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-50">
              Status
            </div>
            <Badge tone={account.status === "active" ? "success" : "muted"}>
              {account.status}
            </Badge>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-50">
              Tier terms
            </div>
            <div className="text-sm">
              {account.tierData
                ? `${account.tierData.label} · ${account.tierData.discountPct}% off · ${account.tierData.commissionPct}% commission · target ${account.tierData.targetMarginPct}% margin`
                : "unset"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-50">
              Owner
            </div>
            <div className="text-sm">{account.ownerStaff?.name ?? "unassigned"}</div>
          </div>
          {account.panNo && (
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-50">
                PAN
              </div>
              <div className="text-sm">{account.panNo}</div>
            </div>
          )}
          {account.sourceCrmLead && (
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-50">
                Converted from lead
              </div>
              <Link
                href={`/sysuser/crm/${account.sourceCrmLead.id}`}
                className="text-sm underline"
              >
                {account.sourceCrmLead.name}
              </Link>
            </div>
          )}
          {account.address && (
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-50">
                Address
              </div>
              <div className="text-sm">{account.address}</div>
            </div>
          )}
        </div>
        {account.notes && (
          <div className="border-t border-[var(--color-border)] p-4">
            <div className="text-[10px] uppercase tracking-wider opacity-50">
              Notes
            </div>
            <p className="whitespace-pre-wrap text-sm">{account.notes}</p>
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-2 font-display text-xl">Deals ({account.deals.length})</h2>
        {account.deals.length === 0 ? (
          <EmptyState
            title="No deals yet"
            description="Open one to start the pipeline."
          />
        ) : (
          <div className="space-y-4">
            {account.deals.map((d) => (
              <Card key={d.id}>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--color-border)] p-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{d.dealName}</span>
                      <Badge tone={STAGE_TONE[d.stage] ?? "neutral"}>
                        {stageLabel(d.stage)}
                      </Badge>
                      {d.tierData && (
                        <span className="text-xs opacity-60">
                          {d.tierData.label} ({d.tierData.discountPct}% off)
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs opacity-60">
                      {d.dateBs}
                      {d.quoteAmount != null &&
                        ` · quote ${formatNpr(d.quoteAmount)}`}
                      {d.expectedCloseDate &&
                        ` · expected ${new Date(d.expectedCloseDate).toLocaleDateString()}`}
                      {d.ownerStaff && ` · ${d.ownerStaff.name}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setStageOpen(d);
                      setStageForm({ toStage: "", note: "", linkedSaleId: "" });
                    }}
                  >
                    {CLOSED.includes(d.stage) ? "Reopen" : "Move stage"}
                  </Button>
                </div>

                {d.quoteLines.length > 0 && (
                  <div className="overflow-x-auto border-b border-[var(--color-border)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[10px] uppercase tracking-wider opacity-50">
                          <th className="p-3">Item</th>
                          <th className="p-3 text-right">Qty</th>
                          <th className="p-3 text-right">MRP</th>
                          <th className="p-3 text-right">Trade rate</th>
                          <th className="p-3 text-right">Discount</th>
                          <th className="p-3 text-right">Line total</th>
                          <th className="p-3 text-right">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.quoteLines.map((l) => (
                          <tr
                            key={l.id}
                            className="border-t border-[var(--color-border)]"
                          >
                            <td className="p-3">
                              {l.productName}
                              {l.variantLabel && (
                                <span className="block text-xs opacity-60">
                                  {l.variantLabel} · {l.sku}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">{l.qty}</td>
                            <td className="p-3 text-right opacity-60">
                              {formatNpr(l.mrp)}
                            </td>
                            <td className="p-3 text-right">
                              {formatNpr(l.wholesaleRate)}
                            </td>
                            <td className="p-3 text-right">
                              {formatNpr(l.discountAmount)}
                              <span className="ml-1 text-xs opacity-60">
                                ({l.discountPct}%)
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              {formatNpr(l.lineTotalWholesale)}
                            </td>
                            <td className="p-3 text-right">
                              {l.marginAmount != null ? (
                                <>
                                  {formatNpr(l.marginAmount)}
                                  <span className="ml-1 text-xs opacity-60">
                                    ({l.marginPct}%)
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs opacity-40">
                                  cost unknown
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="p-4">
                  <div className="mb-2 text-[10px] uppercase tracking-wider opacity-50">
                    Stage history — append-only
                  </div>
                  <ol className="space-y-1 text-sm">
                    {d.stageHistory.map((h) => (
                      <li key={h.id} className="flex flex-wrap items-center gap-2">
                        <span className="opacity-60">
                          {h.fromStage ? `${stageLabel(h.fromStage)} →` : "opened as"}
                        </span>
                        <Badge tone={STAGE_TONE[h.toStage] ?? "neutral"}>
                          {stageLabel(h.toStage)}
                        </Badge>
                        <span className="text-xs opacity-60">
                          {new Date(h.createdAt).toLocaleString()} ·{" "}
                          {h.changedByStaff.name}
                        </span>
                        {h.note && (
                          <span className="text-xs opacity-80">— {h.note}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-[var(--color-border)] p-4 text-xs font-medium uppercase tracking-wider opacity-80">
            Payments ({account.payments.length})
          </div>
          {account.payments.length === 0 ? (
            <div className="p-4 text-sm opacity-60">Nothing received yet.</div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {account.payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2 p-4 text-sm">
                  <span className={p.amount < 0 ? "text-[var(--color-danger,#f87171)]" : ""}>
                    {formatNpr(p.amount)}
                  </span>
                  {p.isAdvance && <Badge tone="gold">advance</Badge>}
                  {p.paymentMethod && (
                    <span className="text-xs opacity-70">{p.paymentMethod.label}</span>
                  )}
                  <span className="text-xs opacity-60">
                    {p.dateBs} · {p.recordedByStaff.name}
                  </span>
                  {p.reference && (
                    <span className="text-xs opacity-60">ref {p.reference}</span>
                  )}
                  {p.note && <span className="w-full text-xs opacity-80">{p.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="border-b border-[var(--color-border)] p-4 text-xs font-medium uppercase tracking-wider opacity-80">
            Invoiced sales ({account.sales.length})
          </div>
          {account.sales.length === 0 ? (
            <div className="p-4 text-sm opacity-60">
              No sales booked to this account yet.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--color-border)]">
              {account.sales.map((s) => (
                <li key={s.id} className="flex items-center gap-2 p-4 text-sm">
                  <Link href={`/sysuser/sales/${s.id}`} className="underline">
                    {s.status === "draft" ? "(draft)" : s.saleNo}
                  </Link>
                  <Badge tone={s.status === "confirmed" ? "success" : "muted"}>
                    {s.status}
                  </Badge>
                  <span className="ml-auto">{formatNpr(s.totalAmount)}</span>
                  <span className="text-xs opacity-60">{s.dateBs}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog
        open={dealOpen}
        onOpenChange={setDealOpen}
        title="New deal"
        description="Opens at 'contacted' and inherits this account's tier."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDealOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addDeal} disabled={saving}>
              {saving ? "Saving…" : "Open deal"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Deal name" required>
            <TextInput
              value={dealForm.dealName}
              onChange={(e) => setDealForm({ ...dealForm, dealName: e.target.value })}
              placeholder="Shrawan bulk order"
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={dealForm.notes}
              onChange={(e) => setDealForm({ ...dealForm, notes: e.target.value })}
              rows={3}
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={!!stageOpen}
        onOpenChange={(open) => !open && setStageOpen(null)}
        title={
          stageOpen && CLOSED.includes(stageOpen.stage) ? "Reopen deal" : "Move stage"
        }
        description={
          stageOpen && CLOSED.includes(stageOpen.stage)
            ? `This deal is "${stageLabel(stageOpen.stage)}". Reopening is recorded as its own dated entry.`
            : "The move is dated and attributed to you in the deal's history."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setStageOpen(null)}>
              Cancel
            </Button>
            <Button onClick={moveStage} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="New stage" required>
            <Select
              value={stageForm.toStage}
              onChange={(v) => setStageForm({ ...stageForm, toStage: v })}
              options={(stageOpen && CLOSED.includes(stageOpen.stage)
                ? OPEN_STAGES
                : ALL_STAGES.filter((s) => s !== stageOpen?.stage)
              ).map((s) => ({ value: s, label: stageLabel(s) }))}
              placeholder="Select stage…"
            />
          </Field>
          {stageForm.toStage === "won" && (
            <Field
              label="Closing sale"
              hint="Links the won deal to the revenue it produced. Only this account's confirmed sales are eligible."
            >
              <Select
                value={stageForm.linkedSaleId}
                onChange={(v) => setStageForm({ ...stageForm, linkedSaleId: v })}
                options={[
                  { value: "", label: "— Not invoiced yet —" },
                  ...account.sales
                    .filter((s) => s.status !== "draft")
                    .map((s) => ({
                      value: s.id,
                      label: `${s.saleNo} · ${formatNpr(s.totalAmount)} · ${s.dateBs}`,
                    })),
                ]}
              />
            </Field>
          )}
          <Field label="Note" hint="Why it moved — shows in the history.">
            <Textarea
              value={stageForm.note}
              onChange={(e) => setStageForm({ ...stageForm, note: e.target.value })}
              rows={3}
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={payOpen}
        onOpenChange={setPayOpen}
        title="Record payment"
        description="Money received. Mark it an advance if it arrived before delivery; use a negative amount for a refund."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addPayment} disabled={saving}>
              {saving ? "Saving…" : "Record"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Amount (NPR)" required>
            <TextInput
              value={payForm.amount}
              onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
              placeholder="15000"
            />
          </Field>
          <Switch
            checked={payForm.isAdvance}
            onChange={(v) => setPayForm({ ...payForm, isAdvance: v })}
            label="Advance"
            description={
              Number(payForm.amount) < 0
                ? "Tick this when the refund returns an advance, so the advances figure nets down."
                : "Received before delivery — counts as money in hand and shows separately."
            }
          />
          <Field label="Method">
            <Select
              value={payForm.paymentMethodId}
              onChange={(v) => setPayForm({ ...payForm, paymentMethodId: v })}
              options={[
                { value: "", label: "— Not recorded —" },
                ...paymentMethods.map((m) => ({ value: m.id, label: m.label })),
              ]}
            />
          </Field>
          <Field label="Reference">
            <TextInput
              value={payForm.reference}
              onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
              placeholder="Cheque / transfer no."
            />
          </Field>
          <Field label="Note">
            <Textarea
              value={payForm.note}
              onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
              rows={2}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
