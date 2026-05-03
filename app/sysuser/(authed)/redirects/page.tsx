"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FieldGrid } from "@/components/ui/section";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";
import { Badge } from "@/components/ui/badge";

interface Row {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  enabled: boolean;
  note: string | null;
}

const empty = {
  fromPath: "",
  toPath: "",
  statusCode: 308,
  enabled: true,
  note: "",
};

export default function RedirectsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [drawer, setDrawer] = useState<{
    open: boolean;
    editingId: string | null;
    state: typeof empty;
  }>({ open: false, editingId: null, state: empty });

  const reload = async () => {
    const j = await fetch("/api/sysuser/redirects").then((r) => r.json());
    setRows(j.redirects ?? []);
  };
  useEffect(() => {
    reload();
  }, []);

  const openNew = () =>
    setDrawer({ open: true, editingId: null, state: { ...empty } });

  const openEdit = (r: Row) =>
    setDrawer({
      open: true,
      editingId: r.id,
      state: {
        fromPath: r.fromPath,
        toPath: r.toPath,
        statusCode: r.statusCode,
        enabled: r.enabled,
        note: r.note ?? "",
      },
    });

  const save = async () => {
    const body = { ...drawer.state, note: drawer.state.note || null };
    const url = drawer.editingId
      ? `/api/sysuser/redirects/${drawer.editingId}`
      : "/api/sysuser/redirects";
    const method = drawer.editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Save failed", j?.message ?? undefined);
      return;
    }
    toast.success("Saved");
    setDrawer({ open: false, editingId: null, state: empty });
    reload();
  };

  const remove = async (r: Row) => {
    const ok = await confirm({
      title: `Delete redirect ${r.fromPath} → ${r.toPath}?`,
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/sysuser/redirects/${r.id}`, { method: "DELETE" });
    toast.success("Deleted");
    reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Site" }, { label: "Redirects" }]}
        title="Redirects"
        description="Forward old URLs to new ones — useful when a slug changes."
        actions={
          <Button icon={<Plus size={12} />} onClick={openNew}>
            New redirect
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ArrowRightLeft size={20} />}
          title="No redirects yet"
          description="Add one when you rename a product or page slug."
          action={
            <Button onClick={openNew} icon={<Plus size={12} />}>
              New redirect
            </Button>
          }
        />
      ) : (
        <Card>
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-base)] p-3"
              >
                <div className="flex-1 font-mono text-xs">
                  <span className="opacity-70">{r.fromPath}</span>
                  <ArrowRightLeft className="mx-2 inline opacity-40" size={10} />
                  <span className="text-[var(--color-gold)]">{r.toPath}</span>
                </div>
                <Badge tone="muted">{r.statusCode}</Badge>
                {r.enabled ? (
                  <Badge tone="success">on</Badge>
                ) : (
                  <Badge tone="muted">off</Badge>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openEdit(r)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 size={12} />}
                  onClick={() => remove(r)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Drawer
        open={drawer.open}
        onOpenChange={(v) => setDrawer((s) => ({ ...s, open: v }))}
        title={drawer.editingId ? "Edit redirect" : "New redirect"}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDrawer({ open: false, editingId: null, state: empty })}
            >
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="From path" required hint="Must start with /">
            <TextInput
              value={drawer.state.fromPath}
              onChange={(e) =>
                setDrawer((s) => ({
                  ...s,
                  state: { ...s.state, fromPath: e.target.value },
                }))
              }
              placeholder="/old-singing-bowl"
            />
          </Field>
          <Field label="To path" required>
            <TextInput
              value={drawer.state.toPath}
              onChange={(e) =>
                setDrawer((s) => ({
                  ...s,
                  state: { ...s.state, toPath: e.target.value },
                }))
              }
              placeholder="/products/singing-bowl"
            />
          </Field>
          <FieldGrid cols={2}>
            <Field label="Status">
              <Select
                value={String(drawer.state.statusCode)}
                onChange={(v) =>
                  setDrawer((s) => ({
                    ...s,
                    state: { ...s.state, statusCode: Number(v) },
                  }))
                }
                options={[
                  { value: "308", label: "308 Permanent" },
                  { value: "301", label: "301 Moved Permanently" },
                  { value: "307", label: "307 Temporary" },
                  { value: "302", label: "302 Found" },
                ]}
              />
            </Field>
            <Field label="Enabled">
              <div className="pt-1.5">
                <Switch
                  checked={drawer.state.enabled}
                  onChange={(v) =>
                    setDrawer((s) => ({
                      ...s,
                      state: { ...s.state, enabled: v },
                    }))
                  }
                />
              </div>
            </Field>
          </FieldGrid>
          <Field label="Note (internal)">
            <TextInput
              value={drawer.state.note}
              onChange={(e) =>
                setDrawer((s) => ({
                  ...s,
                  state: { ...s.state, note: e.target.value },
                }))
              }
            />
          </Field>
        </div>
      </Drawer>
    </div>
  );
}
