"use client";

import { useEffect, useState } from "react";
import { Download, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabList, Tab } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

interface MemberLead {
  id: string;
  name: string;
  whatsapp: string;
  email: string | null;
  source: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

const STATUSES = ["new", "contacted", "activated", "rejected"] as const;
type Filter = (typeof STATUSES)[number] | "all";

const STATUS_TONE: Record<string, "success" | "muted" | "gold" | "danger"> = {
  new: "gold",
  contacted: "muted",
  activated: "success",
  rejected: "danger",
};

export default function MemberLeadsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("new");
  const [rows, setRows] = useState<MemberLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});

  const reload = async () => {
    setLoading(true);
    const qs = filter === "all" ? "" : `?status=${filter}`;
    const j = await fetch(`/api/sysuser/member-leads${qs}`).then((r) =>
      r.json(),
    );
    setRows(j.leads ?? []);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const update = async (
    lead: MemberLead,
    data: { status: string; note?: string | null },
  ) => {
    const res = await fetch(`/api/sysuser/member-leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast.error("Update failed");
      return;
    }
    toast.success("Lead updated");
    reload();
  };

  // Copy-forward into the CRM pipeline (Operations → CRM). One-way and
  // one-time: this queue keeps its own status, and a repeat promotion is
  // rejected server-side so reports can't double-count the same person.
  const promote = async (lead: MemberLead) => {
    const res = await fetch(`/api/sysuser/member-leads/${lead.id}/promote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(j?.message ?? "Could not promote to CRM");
      return;
    }
    toast.success(`${lead.name} added to CRM leads`);
  };

  const exportCsv = () => {
    const header = "name,whatsapp,email,status,source,note,createdAt";
    const lines = rows.map((r) =>
      [r.name, r.whatsapp, r.email ?? "", r.status, r.source, r.note ?? "", r.createdAt]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `member-leads-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Customers" }, { label: "Member leads" }]}
        title="Member Circle leads"
        description="Join requests from the homepage form. Work them new → contacted → activated."
        actions={
          <Button
            variant="secondary"
            icon={<Download size={14} />}
            onClick={exportCsv}
            disabled={rows.length === 0}
          >
            Export CSV
          </Button>
        }
      />

      <Tabs
        defaultValue="new"
        value={filter}
        onValueChange={(v) => setFilter(v as Filter)}
      >
        <TabList>
          <Tab value="new">New</Tab>
          <Tab value="contacted">Contacted</Tab>
          <Tab value="activated">Activated</Tab>
          <Tab value="rejected">Rejected</Tab>
          <Tab value="all">All</Tab>
        </TabList>
      </Tabs>

      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={20} />}
          title={filter === "new" ? "No new leads" : "No leads"}
          description="Member Circle join requests from the homepage land here."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-display text-xl">{r.name}</h3>
                    <Badge tone={STATUS_TONE[r.status] ?? "muted"}>
                      {r.status}
                    </Badge>
                    <span className="text-xs opacity-60">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm opacity-80">
                    <a
                      className="underline hover:text-[var(--color-gold)]"
                      href={`https://wa.me/${r.whatsapp.replace(/^\+/, "")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.whatsapp}
                    </a>
                    {r.email && ` · ${r.email}`}
                    <span className="opacity-60"> · via {r.source}</span>
                  </div>
                  <div className="mt-3 max-w-xl">
                    <Textarea
                      rows={2}
                      placeholder="Admin note…"
                      value={noteDrafts[r.id] ?? r.note ?? ""}
                      onChange={(e) =>
                        setNoteDrafts({ ...noteDrafts, [r.id]: e.target.value })
                      }
                      onBlur={() => {
                        const draft = noteDrafts[r.id];
                        if (draft !== undefined && draft !== (r.note ?? "")) {
                          update(r, { status: r.status, note: draft });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {STATUSES.filter((s) => s !== r.status).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={s === "activated" ? "primary" : "secondary"}
                      onClick={() => update(r, { status: s })}
                    >
                      Mark {s}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => promote(r)}
                    title="Copy this signup into the CRM pipeline as a lead (one-time; this queue is unaffected)"
                  >
                    Promote to CRM
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
