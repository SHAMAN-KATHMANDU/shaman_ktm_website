"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, UserCog, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FieldGrid } from "@/components/ui/section";
import { Select } from "@/components/ui/select";
import { Drawer } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";

type Role = "owner" | "editor" | "staff" | "viewer";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  lastLoginAt: string | null;
  createdAt: string;
  staff: {
    id: string;
    name: string;
    telegramUserId: string | null;
    defaultShowroomKey: string | null;
    active: boolean;
  } | null;
}

const roleOptions = [
  { value: "owner", label: "Owner — full access" },
  { value: "editor", label: "Editor — content CRUD" },
  { value: "staff", label: "Staff — record CRM, sales, stock, footfall" },
  { value: "viewer", label: "Viewer — read-only" },
];

interface NewUserState {
  email: string;
  name: string;
  role: Role;
  password: string;
  // Setting these here creates the linked Staff record in the same step, which
  // is what lets the person record sales and use the Telegram bots.
  telegramUserId: string;
  defaultShowroomKey: string;
}

const emptyNew: NewUserState = {
  email: "",
  name: "",
  role: "editor",
  password: "",
  telegramUserId: "",
  defaultShowroomKey: "",
};

export default function UsersClient() {
  const toast = useToast();
  const [rows, setRows] = useState<User[]>([]);
  const [drawer, setDrawer] = useState<{ open: boolean; state: NewUserState }>({
    open: false,
    state: emptyNew,
  });
  const [showrooms, setShowrooms] = useState<{ key: string; name: string }[]>([]);
  const [resetDrawer, setResetDrawer] = useState<{
    open: boolean;
    user: User | null;
    password: string;
  }>({ open: false, user: null, password: "" });

  const reload = async () => {
    const j = await fetch("/api/sysuser/users").then((r) => r.json());
    setRows(j.users ?? []);
  };

  useEffect(() => {
    reload();
    fetch("/api/sysuser/showrooms")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setShowrooms(j?.showrooms ?? []))
      .catch(() => setShowrooms([]));
  }, []);

  // Mirrors the server's rule, so the drawer's copy matches what will happen.
  const staffWillBeCreated =
    drawer.state.role === "staff" || !!drawer.state.telegramUserId.trim();

  const create = async () => {
    const res = await fetch("/api/sysuser/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: drawer.state.email,
        name: drawer.state.name || undefined,
        role: drawer.state.role,
        password: drawer.state.password,
        telegramUserId: drawer.state.telegramUserId.trim() || undefined,
        defaultShowroomKey: drawer.state.defaultShowroomKey || undefined,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as
        | { message?: string; errors?: unknown }
        | null;
      toast.error("Could not create user", j?.message ?? undefined);
      return;
    }
    toast.success("User created");
    setDrawer({ open: false, state: emptyNew });
    reload();
  };

  const updateRole = async (u: User, role: Role) => {
    const res = await fetch(`/api/sysuser/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Update failed", j?.message ?? undefined);
      return;
    }
    toast.success(`Role set to ${role}`);
    reload();
  };

  const resetPassword = async () => {
    if (!resetDrawer.user) return;
    const res = await fetch(`/api/sysuser/users/${resetDrawer.user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetDrawer.password }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as
        | { message?: string }
        | null;
      toast.error("Password change failed", j?.message ?? undefined);
      return;
    }
    toast.success("Password updated");
    setResetDrawer({ open: false, user: null, password: "" });
  };

  const remove = async (u: User) => {
    const ok = await confirm({
      title: `Delete ${u.email}?`,
      description: "Their access is revoked immediately.",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/sysuser/users/${u.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as
        | { message?: string }
        | null;
      toast.error("Delete failed", j?.message ?? undefined);
      return;
    }
    toast.success("Deleted");
    reload();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Settings" }, { label: "Team" }]}
        title="Team"
        description="Manage admin users and their roles. Owner-only."
        actions={
          <Button
            icon={<Plus size={12} />}
            onClick={() =>
              setDrawer({ open: true, state: { ...emptyNew } })
            }
          >
            Invite user
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users size={20} />}
          title="No admin users"
          description="Create an admin to grant access."
        />
      ) : (
        <Card>
          <div className="space-y-2">
            {rows.map((u) => (
              <div
                key={u.id}
                className="flex flex-wrap items-center gap-3 rounded-input border border-line bg-bone p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base">
                    {u.name || u.email}
                  </div>
                  <div className="text-xs text-ink-soft">
                    {u.email}
                    {u.lastLoginAt && (
                      <>
                        {" · last login "}
                        {new Date(u.lastLoginAt).toLocaleString()}
                      </>
                    )}
                  </div>
                  {u.staff && (
                    <div className="mt-0.5 text-xs text-ink-soft">
                      Staff: {u.staff.name}
                      {u.staff.defaultShowroomKey
                        ? ` · ${u.staff.defaultShowroomKey}`
                        : " · floater"}
                      {u.staff.telegramUserId ? (
                        <>
                          {" · Telegram "}
                          <code>{u.staff.telegramUserId}</code>
                        </>
                      ) : (
                        // Visible on purpose: without an id the bots can't
                        // identify them, and it's the easiest thing to forget.
                        <span className="text-metal-text">
                          {" · no Telegram id yet"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Badge
                  tone={
                    u.role === "owner"
                      ? "gold"
                      : u.role === "editor"
                        ? "success"
                        : "muted"
                  }
                >
                  {u.role}
                </Badge>
                <Select
                  value={u.role}
                  onChange={(v) => updateRole(u, v as Role)}
                  options={roleOptions}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<UserCog size={12} />}
                  onClick={() =>
                    setResetDrawer({ open: true, user: u, password: "" })
                  }
                >
                  Reset password
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 size={12} />}
                  onClick={() => remove(u)}
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
        title="Invite admin user"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDrawer({ open: false, state: emptyNew })}
            >
              Cancel
            </Button>
            <Button onClick={create}>Create</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Email" required>
            <TextInput
              type="email"
              value={drawer.state.email}
              onChange={(e) =>
                setDrawer((s) => ({
                  ...s,
                  state: { ...s.state, email: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Name (optional)">
            <TextInput
              value={drawer.state.name}
              onChange={(e) =>
                setDrawer((s) => ({
                  ...s,
                  state: { ...s.state, name: e.target.value },
                }))
              }
            />
          </Field>
          <FieldGrid cols={2}>
            <Field label="Role">
              <Select
                value={drawer.state.role}
                onChange={(v) =>
                  setDrawer((s) => ({
                    ...s,
                    state: { ...s.state, role: v as Role },
                  }))
                }
                options={roleOptions}
              />
            </Field>
            <Field
              label="Initial password"
              hint="12+ chars, upper, lower, digit, symbol."
            >
              <TextInput
                type="password"
                value={drawer.state.password}
                onChange={(e) =>
                  setDrawer((s) => ({
                    ...s,
                    state: { ...s.state, password: e.target.value },
                  }))
                }
              />
            </Field>
          </FieldGrid>

          <div className="rounded-input border border-line p-3">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-soft">
              Staff record
            </div>
            <p className="mt-1 text-xs text-ink-soft">
              {staffWillBeCreated
                ? "A staff record will be created and linked to this login, so their CRM leads, sales and stock entries are attributed to them."
                : "Fill in a Telegram id, or pick the Staff role, to also create a linked staff record."}
            </p>
            <div className="mt-3 space-y-4">
              <Field
                label="Telegram user ID"
                hint="Numeric id from Telegram (not the @username). Needed before they can use the bots — can be added later under Operations → Staff."
              >
                <TextInput
                  value={drawer.state.telegramUserId}
                  onChange={(e) =>
                    setDrawer((s) => ({
                      ...s,
                      state: { ...s.state, telegramUserId: e.target.value },
                    }))
                  }
                  placeholder="123456789"
                />
              </Field>
              <Field
                label="Default showroom"
                hint="Leave blank for staff who float — the bots will ask them each time."
              >
                <Select
                  value={drawer.state.defaultShowroomKey}
                  onChange={(v) =>
                    setDrawer((s) => ({
                      ...s,
                      state: { ...s.state, defaultShowroomKey: v },
                    }))
                  }
                  options={[
                    { value: "", label: "— Floater —" },
                    ...showrooms.map((r) => ({ value: r.key, label: r.name })),
                  ]}
                />
              </Field>
            </div>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={resetDrawer.open}
        onOpenChange={(v) => setResetDrawer((s) => ({ ...s, open: v }))}
        title={
          resetDrawer.user
            ? `Reset password for ${resetDrawer.user.email}`
            : "Reset password"
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() =>
                setResetDrawer({ open: false, user: null, password: "" })
              }
            >
              Cancel
            </Button>
            <Button onClick={resetPassword}>Update</Button>
          </div>
        }
      >
        <Field
          label="New password"
          hint="12+ chars, upper, lower, digit, symbol."
        >
          <TextInput
            type="password"
            value={resetDrawer.password}
            onChange={(e) =>
              setResetDrawer((s) => ({ ...s, password: e.target.value }))
            }
          />
        </Field>
      </Drawer>
    </div>
  );
}
