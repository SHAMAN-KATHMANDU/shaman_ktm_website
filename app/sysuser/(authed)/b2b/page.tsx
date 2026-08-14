"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
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

interface Balance {
  invoiced: number;
  paid: number;
  advances: number;
  outstanding: number;
}

interface AccountRow {
  id: string;
  companyName: string;
  contactPerson: string | null;
  phone: string | null;
  accountType: string;
  status: string;
  tier: number | null;
  tierData: { tier: number; label: string; discountPct: number } | null;
  ownerStaff: { id: string; name: string } | null;
  _count: { deals: number; payments: number };
  balance: Balance;
}

const TYPES = [
  { value: "hotel", label: "Hotel" },
  { value: "spa", label: "Spa" },
  { value: "interior", label: "Interior" },
  { value: "retailer", label: "Retailer" },
  { value: "exporter", label: "Exporter" },
  { value: "other", label: "Other" },
];

const STATUSES = ["prospect", "active", "dormant", "lost"] as const;

const STATUS_TONE: Record<string, "neutral" | "gold" | "success" | "danger" | "muted"> = {
  prospect: "gold",
  active: "success",
  dormant: "muted",
  lost: "danger",
};

const EMPTY = {
  companyName: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  panNo: "",
  accountType: "hotel",
  tier: "",
  status: "prospect",
  ownerStaffId: "",
  notes: "",
};

export default function B2bPage() {
  const toast = useToast();
  const [status, setStatus] = useState<"all" | (typeof STATUSES)[number]>("all");
  const [accountType, setAccountType] = useState("");
  const [tier, setTier] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [rows, setRows] = useState<AccountRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [tiers, setTiers] = useState<
    { tier: number; label: string; discountPct: number; commissionPct: number }[]
  >([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status !== "all") qs.set("status", status);
    if (accountType) qs.set("accountType", accountType);
    if (tier) qs.set("tier", tier);
    if (search) qs.set("q", search);
    const j = await fetch(`/api/sysuser/b2b/accounts?${qs}`).then((r) => r.json());
    setRows(j.accounts ?? []);
    setTotal(j.total ?? 0);
    setLoading(false);
  }, [status, accountType, tier, search, page, limit]);

  useEffect(() => {
    // load() flips the loading flag before fetching — that's the spinner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/sysuser/staff?active=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setStaff(j?.staff ?? []))
      .catch(() => setStaff([]));
    fetch("/api/sysuser/b2b/tiers")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setTiers(j?.tiers ?? []))
      .catch(() => setTiers([]));
  }, []);

  const totalOutstanding = rows.reduce((s, r) => s + r.balance.outstanding, 0);

  const save = async () => {
    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/sysuser/b2b/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName: form.companyName.trim(),
        contactPerson: form.contactPerson.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        panNo: form.panNo.trim() || null,
        accountType: form.accountType,
        tier: form.tier ? Number(form.tier) : null,
        status: form.status,
        ownerStaffId: form.ownerStaffId || null,
        notes: form.notes.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Could not save the account");
      return;
    }
    toast.success("Trade account created");
    setDialogOpen(false);
    setForm({ ...EMPTY });
    load();
  };

  const columns: Column<AccountRow>[] = [
    {
      key: "company",
      header: "Account",
      render: (r) => (
        <Link href={`/sysuser/b2b/${r.id}`} className="block hover:underline">
          <div className="font-medium">{r.companyName}</div>
          <div className="text-xs text-ink-soft">
            {[r.contactPerson, r.phone].filter(Boolean).join(" · ") || "—"}
          </div>
        </Link>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (r) => TYPES.find((t) => t.value === r.accountType)?.label ?? r.accountType,
    },
    {
      key: "tier",
      header: "Tier",
      render: (r) =>
        r.tierData ? (
          <span>
            {r.tierData.label}
            <span className="ml-1 text-xs text-ink-soft">
              ({r.tierData.discountPct}% off)
            </span>
          </span>
        ) : (
          <span className="text-xs text-ink-soft">unset</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>{r.status}</Badge>
      ),
    },
    { key: "deals", header: "Deals", align: "right", render: (r) => r._count.deals },
    {
      key: "invoiced",
      header: "Invoiced",
      align: "right",
      render: (r) => formatNpr(r.balance.invoiced),
    },
    {
      key: "paid",
      header: "Received",
      align: "right",
      render: (r) => (
        <span>
          {formatNpr(r.balance.paid)}
          {r.balance.advances !== 0 && (
            <span className="block text-[10px] text-ink-soft">
              incl. {formatNpr(r.balance.advances)} advance
            </span>
          )}
        </span>
      ),
    },
    {
      key: "outstanding",
      header: "Outstanding",
      align: "right",
      render: (r) =>
        r.balance.outstanding === 0 ? (
          <span className="text-ink-soft">settled</span>
        ) : r.balance.outstanding > 0 ? (
          <span className="text-metal-text">
            {formatNpr(r.balance.outstanding)}
          </span>
        ) : (
          <span className="text-accent-deep">
            {formatNpr(Math.abs(r.balance.outstanding))} in credit
          </span>
        ),
    },
    {
      key: "owner",
      header: "Owner",
      render: (r) =>
        r.ownerStaff?.name ?? <span className="text-xs text-ink-soft">unassigned</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Operations" }, { label: "B2B" }]}
        title="Wholesale accounts"
        description="Trade accounts, their deal pipeline, and what each one still owes — the last of which nothing tracked before."
        actions={
          <Button icon={<Plus size={14} />} onClick={() => setDialogOpen(true)}>
            New account
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2 p-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-soft">
              Outstanding on this page
            </div>
            <div className="font-display text-2xl">{formatNpr(totalOutstanding)}</div>
          </div>
          <p className="max-w-md text-xs text-ink-soft">
            Invoiced (every non-draft sale booked to the account) minus everything
            received. Advances count as money in hand, so an account can sit in
            credit.
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
          {STATUSES.map((s) => (
            <Tab key={s} value={s}>
              {s}
            </Tab>
          ))}
        </TabList>
      </Tabs>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[14rem] flex-1">
          <Field label="Search">
            <div className="flex gap-2">
              <TextInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearch(q.trim());
                    setPage(1);
                  }
                }}
                placeholder="Company, contact, or phone"
              />
              <Button
                variant="secondary"
                icon={<Search size={14} />}
                onClick={() => {
                  setSearch(q.trim());
                  setPage(1);
                }}
              >
                Find
              </Button>
            </div>
          </Field>
        </div>
        <div className="min-w-[10rem]">
          <Field label="Type">
            <Select
              value={accountType}
              onChange={(v) => {
                setAccountType(v);
                setPage(1);
              }}
              options={[{ value: "", label: "Any type" }, ...TYPES]}
            />
          </Field>
        </div>
        <div className="min-w-[10rem]">
          <Field label="Tier">
            <Select
              value={tier}
              onChange={(v) => {
                setTier(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "Any tier" },
                ...tiers.map((t) => ({
                  value: String(t.tier),
                  label: `${t.label} — ${t.discountPct}% / ${t.commissionPct}%`,
                })),
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
            title="No trade accounts here"
            description="Add one, or convert a wholesale lead from the CRM."
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
        title="New trade account"
        description="Tier sets the default discount on quotes; it can be left unset until agreed."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save account"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Company name" required>
            <TextInput
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact person">
              <TextInput
                value={form.contactPerson}
                onChange={(e) =>
                  setForm({ ...form, contactPerson: e.target.value })
                }
              />
            </Field>
            <Field label="Phone">
              <TextInput
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <TextInput
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="PAN no." hint="For invoicing">
              <TextInput
                value={form.panNo}
                onChange={(e) => setForm({ ...form, panNo: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Address">
            <TextInput
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Type" required>
              <Select
                value={form.accountType}
                onChange={(v) => setForm({ ...form, accountType: v })}
                options={TYPES}
              />
            </Field>
            <Field label="Tier">
              <Select
                value={form.tier}
                onChange={(v) => setForm({ ...form, tier: v })}
                options={[
                  { value: "", label: "— Unset —" },
                  ...tiers.map((t) => ({
                    value: String(t.tier),
                    label: `${t.label} (${t.discountPct}% off)`,
                  })),
                ]}
              />
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={STATUSES.map((s) => ({ value: s, label: s }))}
              />
            </Field>
          </div>
          <Field label="Owner">
            <Select
              value={form.ownerStaffId}
              onChange={(v) => setForm({ ...form, ownerStaffId: v })}
              options={[
                { value: "", label: "— Unassigned —" },
                ...staff.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
