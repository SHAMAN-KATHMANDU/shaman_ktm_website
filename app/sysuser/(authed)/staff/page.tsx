"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, TextInput } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

interface StaffRow {
  id: string;
  name: string;
  phone: string | null;
  telegramUserId: string | null;
  defaultShowroomKey: string | null;
  active: boolean;
  createdAt: string;
  defaultShowroom: { key: string; name: string } | null;
  adminUser: { id: string; email: string; role: string } | null;
}

interface ShowroomOption {
  key: string;
  name: string;
}

const EMPTY_FORM = {
  name: "",
  phone: "",
  telegramUserId: "",
  defaultShowroomKey: "",
  active: true,
};

export default function StaffPage() {
  const toast = useToast();
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [showrooms, setShowrooms] = useState<ShowroomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const j = await fetch("/api/sysuser/staff").then((r) => r.json());
    setRows(j.staff ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // reload() flips the loading flag before fetching — that's the spinner.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    fetch("/api/sysuser/showrooms")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setShowrooms(j?.showrooms ?? []))
      .catch(() => setShowrooms([]));
  }, [reload]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (row: StaffRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      phone: row.phone ?? "",
      telegramUserId: row.telegramUserId ?? "",
      defaultShowroomKey: row.defaultShowroomKey ?? "",
      active: row.active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      telegramUserId: form.telegramUserId.trim() || null,
      defaultShowroomKey: form.defaultShowroomKey || null,
      active: form.active,
    };
    const res = await fetch(
      editing ? `/api/sysuser/staff/${editing.id}` : "/api/sysuser/staff",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.message ?? "Save failed");
      return;
    }
    toast.success(editing ? "Staff updated" : "Staff created");
    setDialogOpen(false);
    reload();
  };

  const columns: Column<StaffRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (r) => (
        <div>
          <div className="font-medium">{r.name}</div>
          {r.phone && <div className="text-xs opacity-60">{r.phone}</div>}
        </div>
      ),
    },
    {
      key: "showroom",
      header: "Default showroom",
      render: (r) =>
        r.defaultShowroom ? (
          r.defaultShowroom.name
        ) : (
          <Badge tone="muted">Floater — bot asks</Badge>
        ),
    },
    {
      key: "telegram",
      header: "Telegram",
      render: (r) =>
        r.telegramUserId ? (
          <code className="text-xs">{r.telegramUserId}</code>
        ) : (
          <span className="text-xs opacity-50">not registered</span>
        ),
    },
    {
      key: "login",
      header: "Web login",
      render: (r) =>
        r.adminUser ? (
          <div className="text-xs">
            {r.adminUser.email}
            <Badge tone="neutral" className="ml-2">
              {r.adminUser.role}
            </Badge>
          </div>
        ) : (
          <span className="text-xs opacity-50">not linked</span>
        ),
    },
    {
      key: "active",
      header: "Status",
      render: (r) =>
        r.active ? (
          <Badge tone="success">Active</Badge>
        ) : (
          <Badge tone="muted">Inactive</Badge>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Operations" }, { label: "Staff" }]}
        title="Staff"
        description="Who can enter reporting data. Telegram ID links a bot user; a staff member with no default showroom is a floater and gets asked which showroom at entry time."
        actions={
          <Button icon={<Plus size={14} />} onClick={openCreate}>
            New staff
          </Button>
        }
      />

      <Card>
        {loading ? (
          <div className="p-6 text-sm opacity-60">Loading…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No staff yet"
            description="Add each person who will record sales, leads, or stock."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(r) => r.id}
            onRowClick={openEdit}
          />
        )}
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? `Edit ${editing.name}` : "New staff"}
        description="Attribution for every reporting record comes from this list."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Name" required>
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sanu"
            />
          </Field>
          <Field label="Phone">
            <TextInput
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+977 98…"
            />
          </Field>
          <Field
            label="Telegram user ID"
            hint="Numeric ID from the bot (not the @username). Leave blank until registered."
          >
            <TextInput
              value={form.telegramUserId}
              onChange={(e) =>
                setForm({ ...form, telegramUserId: e.target.value })
              }
              placeholder="123456789"
            />
          </Field>
          <Field
            label="Default showroom"
            hint="Leave empty for staff who float between showrooms."
          >
            <Select
              value={form.defaultShowroomKey}
              onChange={(v) => setForm({ ...form, defaultShowroomKey: v })}
              options={showrooms.map((s) => ({ value: s.key, label: s.name }))}
              placeholder="— Floater —"
            />
          </Field>
          <Switch
            checked={form.active}
            onChange={(v) => setForm({ ...form, active: v })}
            label="Active"
            description="Inactive staff keep their history but can't be selected for new records."
          />
        </div>
      </Dialog>
    </div>
  );
}
