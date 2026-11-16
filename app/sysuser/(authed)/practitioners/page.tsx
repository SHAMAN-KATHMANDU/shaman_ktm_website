"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FieldGrid } from "@/components/ui/section";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";
import { Badge } from "@/components/ui/badge";
import { BilingualField } from "@/components/sysuser/bilingual-field";
import { ImageUploader } from "@/components/sysuser/image-uploader";

// Practitioners: who leads each service (e.g. a sound healer). Each one shows
// on the page of every service ticked below.

interface Row {
  id: string;
  name: string;
  nameNe: string | null;
  role: string | null;
  roleNe: string | null;
  bio: string;
  bioNe: string | null;
  training: string | null;
  trainingNe: string | null;
  photoUrl: string | null;
  published: boolean;
  position: number;
  services: { slug: string; name: string }[];
}

const empty = {
  name: "",
  nameNe: null as string | null,
  role: "",
  roleNe: null as string | null,
  bio: "",
  bioNe: null as string | null,
  training: "",
  trainingNe: null as string | null,
  photoUrl: "",
  published: true,
  position: 0,
  serviceSlugs: [] as string[],
};

export default function PractitionersPage() {
  const toast = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [services, setServices] = useState<{ slug: string; name: string }[]>([]);
  const [drawer, setDrawer] = useState<{
    open: boolean;
    editingId: string | null;
    state: typeof empty;
  }>({ open: false, editingId: null, state: empty });

  const reload = async () => {
    const j = await fetch("/api/sysuser/practitioners").then((r) => r.json());
    setRows(j.practitioners ?? []);
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial CMS data load
    void reload();
    void fetch("/api/sysuser/services")
      .then((r) => r.json())
      .then((j) => setServices(j.services ?? []));
  }, []);

  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) =>
    setDrawer((s) => ({ ...s, state: { ...s.state, [k]: v } }));

  const openNew = () =>
    setDrawer({
      open: true,
      editingId: null,
      state: { ...empty, position: (rows.at(-1)?.position ?? 0) + 10 },
    });

  const openEdit = (r: Row) =>
    setDrawer({
      open: true,
      editingId: r.id,
      state: {
        name: r.name,
        nameNe: r.nameNe,
        role: r.role ?? "",
        roleNe: r.roleNe,
        bio: r.bio,
        bioNe: r.bioNe,
        training: r.training ?? "",
        trainingNe: r.trainingNe,
        photoUrl: r.photoUrl ?? "",
        published: r.published,
        position: r.position,
        serviceSlugs: r.services.map((s) => s.slug),
      },
    });

  const close = () => setDrawer({ open: false, editingId: null, state: empty });

  const toggleService = (slug: string, on: boolean) =>
    set(
      "serviceSlugs",
      on
        ? [...drawer.state.serviceSlugs, slug]
        : drawer.state.serviceSlugs.filter((s) => s !== slug),
    );

  const save = async () => {
    const url = drawer.editingId
      ? `/api/sysuser/practitioners/${drawer.editingId}`
      : "/api/sysuser/practitioners";
    const res = await fetch(url, {
      method: drawer.editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(drawer.state),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Save failed", j?.message ?? undefined);
      return;
    }
    toast.success("Saved");
    close();
    reload();
  };

  const remove = async (r: Row) => {
    const ok = await confirm({
      title: `Delete ${r.name}?`,
      description: "To hide them without losing the profile, switch off Published instead.",
      variant: "danger",
    });
    if (!ok) return;
    await fetch(`/api/sysuser/practitioners/${r.id}`, { method: "DELETE" });
    toast.success("Deleted");
    reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Content" }, { label: "Practitioners" }]}
        title="Practitioners"
        description="Who leads each service. A practitioner shows on the page of every service they are linked to."
        actions={
          <Button icon={<Plus size={12} />} onClick={openNew}>
            New practitioner
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<UserRound size={20} />}
          title="No practitioners yet"
          description="Add the people who lead your sessions: a photo, a short bio and their training."
          action={
            <Button onClick={openNew} icon={<Plus size={12} />}>
              New practitioner
            </Button>
          }
        />
      ) : (
        <Card>
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 border border-line bg-bone p-3"
              >
                {r.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.photoUrl} alt="" className="h-10 w-10 object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center bg-surface text-ink-soft">
                    <UserRound size={16} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    {r.name}
                    {r.role && <span className="text-ink-soft"> · {r.role}</span>}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {r.services.length
                      ? r.services.map((s) => s.name).join(", ")
                      : "Not linked to a service yet"}
                  </p>
                </div>
                {!r.nameNe && <Badge tone="muted">NE missing</Badge>}
                {r.published ? (
                  <Badge tone="success">published</Badge>
                ) : (
                  <Badge tone="muted">hidden</Badge>
                )}
                <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
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
        title={drawer.editingId ? "Edit practitioner" : "New practitioner"}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <BilingualField
            label="Name"
            required
            enValue={drawer.state.name}
            neValue={drawer.state.nameNe}
            onEnChange={(v) => set("name", v)}
            onNeChange={(v) => set("nameNe", v)}
          />
          <BilingualField
            label="Role"
            enValue={drawer.state.role}
            neValue={drawer.state.roleNe}
            onEnChange={(v) => set("role", v)}
            onNeChange={(v) => set("roleNe", v)}
            placeholder="Sound healer"
          />
          <BilingualField
            label="Bio"
            required
            multiline
            enValue={drawer.state.bio}
            neValue={drawer.state.bioNe}
            onEnChange={(v) => set("bio", v)}
            onNeChange={(v) => set("bioNe", v)}
            hint="Markdown. A few sentences in their own words works best."
          />
          <BilingualField
            label="Training and certifications"
            multiline
            enValue={drawer.state.training}
            neValue={drawer.state.trainingNe}
            onEnChange={(v) => set("training", v)}
            onNeChange={(v) => set("trainingNe", v)}
            hint="Markdown list, e.g. - Sound healing training, Kathmandu, 2019. Only what they can show."
          />
          <Field label="Photo">
            <div className="flex items-center gap-3">
              {drawer.state.photoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={drawer.state.photoUrl} alt="" className="h-20 w-16 object-cover" />
              )}
              <ImageUploader
                onUploaded={(url) => set("photoUrl", url)}
                label={drawer.state.photoUrl ? "Replace photo" : "+ Upload photo"}
              />
              {drawer.state.photoUrl && (
                <Button size="sm" variant="secondary" onClick={() => set("photoUrl", "")}>
                  Remove
                </Button>
              )}
            </div>
          </Field>
          <Field label="Leads these services">
            <div className="space-y-2">
              {services.map((s) => (
                <Checkbox
                  key={s.slug}
                  label={s.name}
                  checked={drawer.state.serviceSlugs.includes(s.slug)}
                  onChange={(on) => toggleService(s.slug, on)}
                />
              ))}
              {services.length === 0 && (
                <p className="text-sm text-ink-soft">No services yet.</p>
              )}
            </div>
          </Field>
          <FieldGrid cols={2}>
            <Field label="Position" hint="Lower comes first">
              <TextInput
                type="number"
                value={String(drawer.state.position)}
                onChange={(e) => set("position", Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Published">
              <div className="pt-1.5">
                <Switch
                  checked={drawer.state.published}
                  onChange={(v) => set("published", v)}
                />
              </div>
            </Field>
          </FieldGrid>
        </div>
      </Drawer>
    </div>
  );
}
