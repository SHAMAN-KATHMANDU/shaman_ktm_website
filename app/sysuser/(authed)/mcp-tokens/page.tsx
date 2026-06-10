"use client";

import { useEffect, useState } from "react";
import { Copy, Eye, EyeOff, Lock, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/field";
import { FieldGrid } from "@/components/ui/section";
import { Select } from "@/components/ui/select";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";
import { Badge } from "@/components/ui/badge";

interface Token {
  id: string;
  name: string;
  role: "owner" | "editor" | "viewer";
  createdBy: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
}

interface CreateResponse {
  token: string;
  id: string;
  name: string;
  role: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
}

const empty = {
  name: "",
  role: "editor" as "owner" | "editor" | "viewer",
  expiresAt: "",
};

export default function McpTokensPage() {
  const toast = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [drawer, setDrawer] = useState<{
    open: boolean;
    state: typeof empty;
  }>({ open: false, state: empty });
  const [plaintext, setPlaintext] = useState<{
    show: boolean;
    token: string;
    name: string;
  } | null>(null);
  const [showPlaintext, setShowPlaintext] = useState(false);

  const reload = async () => {
    const j = await fetch("/api/sysuser/mcp-tokens").then((r) => r.json());
    setTokens(j.tokens ?? []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, []);

  const openNew = () =>
    setDrawer({ open: true, state: { ...empty } });

  const save = async () => {
    const body = {
      name: drawer.state.name,
      role: drawer.state.role,
      expiresAt: drawer.state.expiresAt || undefined,
    };
    const res = await fetch("/api/sysuser/mcp-tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      toast.error("Save failed", j?.message ?? undefined);
      return;
    }
    const data = (await res.json()) as CreateResponse;
    toast.success("Token created");
    setPlaintext({
      show: true,
      token: data.token,
      name: data.name,
    });
    setDrawer({ open: false, state: empty });
    reload();
  };

  const revoke = async (t: Token) => {
    const ok = await confirm({
      title: `Revoke token "${t.name}"?`,
      description:
        "Any clients using this token will be unable to authenticate. This cannot be undone.",
      variant: "danger",
    });
    if (!ok) return;
    const res = await fetch(`/api/sysuser/mcp-tokens/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoke: true }),
    });
    if (!res.ok) {
      toast.error("Revoke failed");
      return;
    }
    toast.success("Token revoked");
    reload();
  };

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Copied to clipboard");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin" }, { label: "MCP Tokens" }]}
        title="MCP Tokens"
        description="Create and manage Bearer tokens for Claude MCP access. Tokens are shown once at creation."
        actions={
          <Button icon={<Plus size={12} />} onClick={openNew}>
            New token
          </Button>
        }
      />

      {tokens.length === 0 ? (
        <EmptyState
          icon={<Lock size={20} />}
          title="No tokens yet"
          description="Create a token to authorize Claude or other MCP clients."
          action={
            <Button onClick={openNew} icon={<Plus size={12} />}>
              New token
            </Button>
          }
        />
      ) : (
        <Card>
          <div className="space-y-2">
            {tokens.map((t) => {
              const isRevoked = !!t.revokedAt;
              const expired = isExpired(t.expiresAt);
              return (
                <div
                  key={t.id}
                  className={`flex flex-wrap items-center gap-3 rounded-md border p-3 transition ${
                    isRevoked || expired
                      ? "border-[var(--color-border)]/50 bg-[var(--color-base)]/50 opacity-50"
                      : "border-[var(--color-border)] bg-[var(--color-base)]"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{t.name}</div>
                    <div className="text-xs opacity-70 space-y-0.5">
                      <div>
                        Created {formatDate(t.createdAt)} by {t.createdBy}
                      </div>
                      {t.lastUsedAt && (
                        <div>Last used {formatTime(t.lastUsedAt)}</div>
                      )}
                      {t.expiresAt && (
                        <div>
                          Expires {formatTime(t.expiresAt)}
                          {expired && " (expired)"}
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge tone={isRevoked ? "danger" : "muted"}>
                    {isRevoked ? "revoked" : t.role}
                  </Badge>
                  {!isRevoked && (
                    <Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 size={12} />}
                      onClick={() => revoke(t)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Drawer
        open={drawer.open}
        onOpenChange={(v) => setDrawer((s) => ({ ...s, open: v }))}
        title="New MCP Token"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDrawer({ open: false, state: empty })}
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={!drawer.state.name.trim()}
            >
              Create
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Token name" required hint="e.g. claude-desktop, automation-bot">
            <TextInput
              value={drawer.state.name}
              onChange={(e) =>
                setDrawer((s) => ({
                  ...s,
                  state: { ...s.state, name: e.target.value },
                }))
              }
              placeholder="my-token"
            />
          </Field>
          <FieldGrid cols={2}>
            <Field label="Role">
              <Select
                value={drawer.state.role}
                onChange={(v) =>
                  setDrawer((s) => ({
                    ...s,
                    state: { ...s.state, role: v as "owner" | "editor" | "viewer" },
                  }))
                }
                options={[
                  { value: "viewer", label: "Viewer (read-only)" },
                  { value: "editor", label: "Editor (default)" },
                  { value: "owner", label: "Owner (full access)" },
                ]}
              />
            </Field>
            <Field label="Expires at" hint="Optional; leave blank for no expiry">
              <input
                type="datetime-local"
                value={drawer.state.expiresAt}
                onChange={(e) =>
                  setDrawer((s) => ({
                    ...s,
                    state: { ...s.state, expiresAt: e.target.value },
                  }))
                }
                className="w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm text-[var(--color-cream)] placeholder-opacity-50 focus:border-[var(--color-gold)] focus:outline-none"
              />
            </Field>
          </FieldGrid>
        </div>
      </Drawer>

      {plaintext?.show && (
        <div className="rounded-lg border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5 p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-gold)]">
              <Lock size={14} />
              One-time token display
            </div>
            <p className="text-xs opacity-70">
              Copy this token now — it won&apos;t be shown again. Store it securely.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[var(--color-surface)] rounded border border-[var(--color-border)] px-3 py-2">
            <code className="flex-1 font-mono text-xs break-all">
              {showPlaintext ? plaintext.token : plaintext.token.slice(0, 10) + "•••"}
            </code>
            <button
              type="button"
              onClick={() => setShowPlaintext(!showPlaintext)}
              className="p-1 rounded hover:bg-[var(--color-base)] transition"
              title={showPlaintext ? "Hide" : "Show"}
            >
              {showPlaintext ? (
                <EyeOff size={14} />
              ) : (
                <Eye size={14} />
              )}
            </button>
            <button
              type="button"
              onClick={() => copyToken(plaintext.token)}
              className="p-1 rounded hover:bg-[var(--color-base)] transition"
              title="Copy"
            >
              <Copy size={14} />
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
            <div className="text-xs font-medium">Add to Claude:</div>
            <code className="block text-xs bg-[var(--color-surface)] rounded border border-[var(--color-border)] p-2 font-mono whitespace-pre-wrap break-words">
              {`claude mcp add --transport http shaman \\
  <your-site-url>/api/mcp \\
  --header "Authorization: Bearer ${showPlaintext ? plaintext.token : plaintext.token.slice(0, 10) + "•••"}"`}
            </code>
          </div>

          <button
            type="button"
            onClick={() => setPlaintext(null)}
            className="text-xs text-[var(--color-gold)] hover:underline"
          >
            Close this dialog
          </button>
        </div>
      )}
    </div>
  );
}
