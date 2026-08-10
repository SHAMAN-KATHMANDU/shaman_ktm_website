"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, MessageSquarePlus, RotateCcw } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

interface HistoryRow {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  changedByStaff: { id: string; name: string };
}

interface FollowupRow {
  id: string;
  channel: string;
  gotResponse: boolean;
  notes: string | null;
  followupAt: string;
  staff: { id: string; name: string };
}

interface LeadDetail {
  id: string;
  name: string;
  phone: string;
  phoneAlt: string | null;
  email: string | null;
  interest: string;
  status: string;
  askedLocation: boolean;
  willVisit: boolean;
  visitDate: string | null;
  followUpDate: string | null;
  notes: string | null;
  evidenceUrl: string | null;
  linkedSaleId: string | null;
  linkedB2bAccountId: string | null;
  createdAt: string;
  source: { id: string; label: string };
  assignedStaff: { id: string; name: string } | null;
  createdByStaff: { id: string; name: string };
  showroom: { key: string; name: string } | null;
  statusHistory: HistoryRow[];
  followups: FollowupRow[];
}

const STATUSES = ["new", "hot", "warm", "cold", "purchase", "dnc"] as const;
const TERMINAL = ["purchase", "dnc"];

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

const CHANNELS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "call", label: "Phone call" },
  { value: "sms", label: "SMS" },
  { value: "messenger", label: "Messenger" },
  { value: "instagram", label: "Instagram DM" },
  { value: "in_person", label: "In person" },
];

export default function CrmLeadDetailPage() {
  const params = useParams<{ id: string }>();
  const toast = useToast();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ toStatus: "", note: "" });
  const [followupOpen, setFollowupOpen] = useState(false);
  const [followupForm, setFollowupForm] = useState({
    channel: "whatsapp",
    gotResponse: false,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/sysuser/crm/${params.id}`);
    const j = await res.json().catch(() => null);
    setLead(res.ok ? (j?.lead ?? null) : null);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    // load() flips the loading flag before fetching — that's the spinner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const isTerminal = lead ? TERMINAL.includes(lead.status) : false;

  const changeStatus = async () => {
    if (!statusForm.toStatus) {
      toast.error("Pick a status");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/sysuser/crm/${params.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toStatus: statusForm.toStatus,
        note: statusForm.note.trim() || null,
        // Moving out of purchase/dnc is a deliberate reopen, recorded as such.
        reopen: isTerminal,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Status change failed");
      return;
    }
    toast.success("Status updated");
    setStatusOpen(false);
    setStatusForm({ toStatus: "", note: "" });
    load();
  };

  const addFollowup = async () => {
    setSaving(true);
    const res = await fetch(`/api/sysuser/crm/${params.id}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: followupForm.channel,
        gotResponse: followupForm.gotResponse,
        notes: followupForm.notes.trim() || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Could not log follow-up");
      return;
    }
    toast.success("Follow-up logged");
    setFollowupOpen(false);
    setFollowupForm({ channel: "whatsapp", gotResponse: false, notes: "" });
    load();
  };

  if (loading) {
    return <div className="p-6 text-sm opacity-60">Loading…</div>;
  }
  if (!lead) {
    return (
      <div className="space-y-4">
        <Link
          href="/sysuser/crm"
          className="inline-flex items-center gap-1 text-sm opacity-70 hover:opacity-100"
        >
          <ArrowLeft size={14} /> Back to CRM
        </Link>
        <Card>
          <div className="p-6 text-sm opacity-70">
            This lead no longer exists.
          </div>
        </Card>
      </div>
    );
  }

  const detail = (label: string, value: React.ReactNode) => (
    <div>
      <div className="text-[10px] uppercase tracking-wider opacity-50">
        {label}
      </div>
      <div className="text-sm">{value}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: "Operations" },
          { label: "CRM", href: "/sysuser/crm" },
          { label: lead.name },
        ]}
        title={lead.name}
        description={`${lead.phone}${lead.email ? ` · ${lead.email}` : ""}`}
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              icon={<MessageSquarePlus size={14} />}
              onClick={() => setFollowupOpen(true)}
            >
              Log follow-up
            </Button>
            <Button
              icon={isTerminal ? <RotateCcw size={14} /> : undefined}
              onClick={() => setStatusOpen(true)}
            >
              {isTerminal ? "Reopen lead" : "Change status"}
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="grid gap-4 p-4 sm:grid-cols-3">
            {detail(
              "Status",
              <Badge tone={STATUS_TONE[lead.status] ?? "neutral"}>
                {STATUS_LABEL[lead.status] ?? lead.status}
              </Badge>,
            )}
            {detail("Interest", lead.interest.replace("_", " / "))}
            {detail("Source", lead.source.label)}
            {detail("Showroom", lead.showroom?.name ?? "—")}
            {detail(
              "Assigned",
              lead.assignedStaff?.name ?? "unassigned",
            )}
            {detail("Recorded by", lead.createdByStaff.name)}
            {detail(
              "Asked for location",
              lead.askedLocation ? "Yes" : "No",
            )}
            {detail("Will visit", lead.willVisit ? "Yes" : "No")}
            {detail(
              "Visit date",
              lead.visitDate
                ? new Date(lead.visitDate).toLocaleDateString()
                : "—",
            )}
            {detail(
              "Follow-up due",
              lead.followUpDate
                ? new Date(lead.followUpDate).toLocaleDateString()
                : "—",
            )}
            {detail(
              "Recorded at",
              new Date(lead.createdAt).toLocaleString(),
            )}
            {lead.linkedSaleId && detail("Linked sale", lead.linkedSaleId)}
            {lead.linkedB2bAccountId &&
              detail("Linked B2B account", lead.linkedB2bAccountId)}
          </div>
          {lead.notes && (
            <div className="border-t border-[var(--color-border)] p-4">
              <div className="text-[10px] uppercase tracking-wider opacity-50">
                Notes
              </div>
              <p className="whitespace-pre-wrap text-sm">{lead.notes}</p>
            </div>
          )}
          {lead.evidenceUrl && (
            <div className="border-t border-[var(--color-border)] p-4">
              <div className="text-[10px] uppercase tracking-wider opacity-50">
                Evidence
              </div>
              <a
                href={lead.evidenceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm underline"
              >
                View screenshot
              </a>
            </div>
          )}
        </Card>

        <Card>
          <div className="border-b border-[var(--color-border)] p-4">
            <div className="text-xs font-medium uppercase tracking-wider opacity-80">
              Status history
            </div>
            <p className="mt-1 text-xs opacity-60">
              Append-only — nothing here is ever rewritten.
            </p>
          </div>
          <ol className="divide-y divide-[var(--color-border)]">
            {lead.statusHistory.map((h) => (
              <li key={h.id} className="p-4 text-sm">
                <div className="flex items-center gap-2">
                  {h.fromStatus ? (
                    <>
                      <span className="opacity-60">
                        {STATUS_LABEL[h.fromStatus] ?? h.fromStatus}
                      </span>
                      <span className="opacity-40">→</span>
                    </>
                  ) : (
                    <span className="opacity-60">created as</span>
                  )}
                  <Badge tone={STATUS_TONE[h.toStatus] ?? "neutral"}>
                    {STATUS_LABEL[h.toStatus] ?? h.toStatus}
                  </Badge>
                </div>
                <div className="mt-1 text-xs opacity-60">
                  {new Date(h.createdAt).toLocaleString()} · {h.changedByStaff.name}
                </div>
                {h.note && <p className="mt-1 text-xs opacity-80">{h.note}</p>}
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card>
        <div className="border-b border-[var(--color-border)] p-4">
          <div className="text-xs font-medium uppercase tracking-wider opacity-80">
            Follow-ups ({lead.followups.length})
          </div>
        </div>
        {lead.followups.length === 0 ? (
          <div className="p-4 text-sm opacity-60">
            No follow-ups logged yet.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {lead.followups.map((f) => (
              <li key={f.id} className="flex flex-wrap gap-3 p-4 text-sm">
                <Badge tone="neutral">
                  {CHANNELS.find((c) => c.value === f.channel)?.label ??
                    f.channel}
                </Badge>
                <Badge tone={f.gotResponse ? "success" : "muted"}>
                  {f.gotResponse ? "Replied" : "No reply"}
                </Badge>
                <span className="text-xs opacity-60">
                  {new Date(f.followupAt).toLocaleString()} · {f.staff.name}
                </span>
                {f.notes && (
                  <span className="w-full text-xs opacity-80">{f.notes}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        title={isTerminal ? "Reopen lead" : "Change status"}
        description={
          isTerminal
            ? `This lead is "${STATUS_LABEL[lead.status]}". Reopening is recorded as its own dated entry.`
            : "The change is dated and attributed to you in the lead's history."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusOpen(false)}>
              Cancel
            </Button>
            <Button onClick={changeStatus} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="New status" required>
            <Select
              value={statusForm.toStatus}
              onChange={(v) => setStatusForm({ ...statusForm, toStatus: v })}
              options={STATUSES.filter((s) =>
                isTerminal ? !TERMINAL.includes(s) : s !== lead.status,
              ).map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
              placeholder="Select status…"
            />
          </Field>
          <Field label="Note" hint="Why it moved — shows in the history.">
            <Textarea
              value={statusForm.note}
              onChange={(e) =>
                setStatusForm({ ...statusForm, note: e.target.value })
              }
              rows={3}
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={followupOpen}
        onOpenChange={setFollowupOpen}
        title="Log follow-up"
        description="Records that you reached out, and whether they answered."
        footer={
          <>
            <Button variant="secondary" onClick={() => setFollowupOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addFollowup} disabled={saving}>
              {saving ? "Saving…" : "Log it"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Channel" required>
            <Select
              value={followupForm.channel}
              onChange={(v) =>
                setFollowupForm({ ...followupForm, channel: v })
              }
              options={CHANNELS}
            />
          </Field>
          <Switch
            checked={followupForm.gotResponse}
            onChange={(v) =>
              setFollowupForm({ ...followupForm, gotResponse: v })
            }
            label="They replied"
          />
          <Field label="Notes">
            <Textarea
              value={followupForm.notes}
              onChange={(e) =>
                setFollowupForm({ ...followupForm, notes: e.target.value })
              }
              rows={3}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
