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
import { Switch } from "@/components/ui/switch";
import { Pagination } from "@/components/ui/pagination";
import { Tabs, TabList, Tab } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

interface LeadRow {
  id: string;
  name: string;
  phone: string;
  phoneAlt: string | null;
  email: string | null;
  interest: string;
  status: string;
  followUpDate: string | null;
  createdAt: string;
  source: { id: string; label: string };
  assignedStaff: { id: string; name: string } | null;
  createdByStaff: { id: string; name: string };
  showroom: { key: string; name: string } | null;
  _count: { followups: number };
}

const STATUSES = ["new", "hot", "warm", "cold", "purchase", "dnc"] as const;
type StatusFilter = (typeof STATUSES)[number] | "all";

const STATUS_TONE: Record<string, "neutral" | "gold" | "success" | "danger" | "muted"> = {
  new: "neutral",
  hot: "gold",
  warm: "gold",
  cold: "muted",
  purchase: "success",
  dnc: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
  purchase: "Purchased",
  dnc: "Do not contact",
};

const INTERESTS = [
  { value: "retail", label: "Retail" },
  { value: "wholesale_b2b", label: "Wholesale / B2B" },
  { value: "custom_order", label: "Custom order" },
];

const EMPTY_FORM = {
  name: "",
  phone: "",
  phoneAlt: "",
  email: "",
  sourceId: "",
  interest: "retail",
  status: "new",
  askedLocation: false,
  willVisit: false,
  showroomKey: "",
  assignedStaffId: "",
  notes: "",
};

export default function CrmPage() {
  const toast = useToast();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [interest, setInterest] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [rows, setRows] = useState<LeadRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [sources, setSources] = useState<{ id: string; label: string }[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [showrooms, setShowrooms] = useState<{ key: string; name: string }[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status !== "all") qs.set("status", status);
    if (interest) qs.set("interest", interest);
    if (sourceId) qs.set("sourceId", sourceId);
    if (search) qs.set("q", search);
    const j = await fetch(`/api/sysuser/crm?${qs}`).then((r) => r.json());
    setRows(j.leads ?? []);
    setCounts(j.counts ?? {});
    setTotal(j.total ?? 0);
    setLoading(false);
  }, [status, interest, sourceId, search, page, limit]);

  useEffect(() => {
    // load() flips the loading flag before fetching — that's the spinner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/sysuser/lead-sources")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSources(j?.leadSources ?? []))
      .catch(() => setSources([]));
    fetch("/api/sysuser/staff?active=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setStaff(j?.staff ?? []))
      .catch(() => setStaff([]));
    fetch("/api/sysuser/showrooms")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setShowrooms(j?.showrooms ?? []))
      .catch(() => setShowrooms([]));
  }, []);

  const totalAll = STATUSES.reduce((sum, s) => sum + (counts[s] ?? 0), 0);

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.sourceId) {
      toast.error("Name, phone and source are required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/sysuser/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        phone: form.phone.trim(),
        phoneAlt: form.phoneAlt.trim() || null,
        email: form.email.trim() || null,
        sourceId: form.sourceId,
        interest: form.interest,
        status: form.status,
        askedLocation: form.askedLocation,
        willVisit: form.willVisit,
        showroomKey: form.showroomKey || null,
        assignedStaffId: form.assignedStaffId || null,
        notes: form.notes.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Could not save lead");
      return;
    }
    toast.success("Lead recorded");
    setDialogOpen(false);
    setForm({ ...EMPTY_FORM });
    load();
  };

  const columns: Column<LeadRow>[] = [
    {
      key: "name",
      header: "Lead",
      render: (r) => (
        <Link href={`/sysuser/crm/${r.id}`} className="block hover:underline">
          <div className="font-medium">{r.name}</div>
          <div className="text-xs opacity-60">
            {r.phone}
            {r.phoneAlt ? ` · ${r.phoneAlt}` : ""}
          </div>
        </Link>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <Badge tone={STATUS_TONE[r.status] ?? "neutral"}>
          {STATUS_LABEL[r.status] ?? r.status}
        </Badge>
      ),
    },
    {
      key: "interest",
      header: "Interest",
      render: (r) =>
        INTERESTS.find((i) => i.value === r.interest)?.label ?? r.interest,
    },
    { key: "source", header: "Source", render: (r) => r.source.label },
    {
      key: "showroom",
      header: "Showroom",
      render: (r) =>
        r.showroom?.name ?? <span className="text-xs opacity-40">—</span>,
    },
    {
      key: "assigned",
      header: "Assigned",
      render: (r) =>
        r.assignedStaff?.name ?? (
          <span className="text-xs opacity-40">unassigned</span>
        ),
    },
    {
      key: "followups",
      header: "Follow-ups",
      align: "right",
      render: (r) => r._count.followups,
    },
    {
      key: "createdAt",
      header: "Recorded",
      render: (r) => (
        <div className="text-xs opacity-70">
          {new Date(r.createdAt).toLocaleDateString()}
          <div className="opacity-70">by {r.createdByStaff.name}</div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Operations" }, { label: "CRM" }]}
        title="CRM leads"
        description="Every enquiry as its own record. The counts below are queries over these rows — no daily tally is ever typed by hand."
        actions={
          <Button icon={<Plus size={14} />} onClick={() => setDialogOpen(true)}>
            New lead
          </Button>
        }
      />

      <Tabs
        defaultValue="all"
        value={status}
        onValueChange={(v) => {
          setStatus(v as StatusFilter);
          setPage(1);
        }}
      >
        <TabList>
          <Tab value="all">All ({totalAll})</Tab>
          {STATUSES.map((s) => (
            <Tab key={s} value={s}>
              {STATUS_LABEL[s]} ({counts[s] ?? 0})
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
                placeholder="Name or phone"
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
        <div className="min-w-[11rem]">
          <Field label="Interest">
            <Select
              value={interest}
              onChange={(v) => {
                setInterest(v);
                setPage(1);
              }}
              options={[{ value: "", label: "Any interest" }, ...INTERESTS]}
            />
          </Field>
        </div>
        <div className="min-w-[11rem]">
          <Field label="Source">
            <Select
              value={sourceId}
              onChange={(v) => {
                setSourceId(v);
                setPage(1);
              }}
              options={[
                { value: "", label: "Any source" },
                ...sources.map((s) => ({ value: s.id, label: s.label })),
              ]}
            />
          </Field>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="p-6 text-sm opacity-60">Loading…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No leads here"
            description="Record an enquiry, or widen the filters."
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
        title="New lead"
        description="Recorded against you, with a server timestamp. The status you pick starts the lead's history."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save lead"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required>
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" required>
              <TextInput
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+977 98…"
              />
            </Field>
            <Field label="Alt phone">
              <TextInput
                value={form.phoneAlt}
                onChange={(e) => setForm({ ...form, phoneAlt: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Email">
            <TextInput
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source" required hint="How they reached us">
              <Select
                value={form.sourceId}
                onChange={(v) => setForm({ ...form, sourceId: v })}
                options={sources.map((s) => ({ value: s.id, label: s.label }))}
                placeholder="Select source…"
                searchable
              />
            </Field>
            <Field label="Interest" required hint="What they want to buy">
              <Select
                value={form.interest}
                onChange={(v) => setForm({ ...form, interest: v })}
                options={INTERESTS}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={STATUSES.map((s) => ({
                  value: s,
                  label: STATUS_LABEL[s],
                }))}
              />
            </Field>
            <Field label="Showroom">
              <Select
                value={form.showroomKey}
                onChange={(v) => setForm({ ...form, showroomKey: v })}
                options={[
                  { value: "", label: "— None —" },
                  ...showrooms.map((s) => ({ value: s.key, label: s.name })),
                ]}
              />
            </Field>
          </div>
          <Field label="Assign to">
            <Select
              value={form.assignedStaffId}
              onChange={(v) => setForm({ ...form, assignedStaffId: v })}
              options={[
                { value: "", label: "— Unassigned —" },
                ...staff.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Switch
              checked={form.askedLocation}
              onChange={(v) => setForm({ ...form, askedLocation: v })}
              label="Asked for location"
              size="sm"
            />
            <Switch
              checked={form.willVisit}
              onChange={(v) => setForm({ ...form, willVisit: v })}
              label="Says they'll visit"
              size="sm"
            />
          </div>
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
