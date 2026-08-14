"use client";

// MCP Connections. Clients connect via the OAuth 2.1 flow (they register
// themselves, then land on /sysuser/oauth-consent for approval) — there is no
// manual token provisioning here anymore. This page shows the endpoint to
// paste into a client plus every active connection, each revocable.
// (The route keeps its /sysuser/mcp-tokens path; connections are McpToken
// rows underneath.)

import { useEffect, useState } from "react";
import { Copy, Lock, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { confirm } from "@/components/ui/confirm";
import { prompt as askPrompt } from "@/components/ui/prompt";
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
  /** Set when the token was minted by the OAuth flow (remote connectors). */
  oauthClient: {
    id: string;
    clientId: string;
    clientName: string | null;
    /** Admin-set nickname; wins over the self-reported clientName. */
    label: string | null;
  } | null;
}

export default function McpConnectionsPage() {
  const toast = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [mcpUrl, setMcpUrl] = useState("");

  const reload = async () => {
    const j = await fetch("/api/sysuser/mcp-tokens").then((r) => r.json());
    setTokens(j.tokens ?? []);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMcpUrl(`${window.location.origin}/api/mcp`);
    void reload();
  }, []);

  const revoke = async (t: Token) => {
    const ok = await confirm({
      title: `Revoke "${connectionName(t)}"?`,
      description:
        "This client loses access immediately — including its ability to refresh — and must re-authorize from scratch. Other connections are unaffected.",
      variant: "danger",
      confirmLabel: "Revoke",
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
    toast.success("Connection revoked");
    reload();
  };

  // Every claude.ai connector reports the same client_name, so fall back to a
  // short slice of its unique client_id to keep two connections distinct.
  const shortId = (clientId: string) => clientId.replace(/^smk_oc_/, "").slice(0, 6);

  const connectionName = (t: Token) =>
    t.oauthClient
      ? (t.oauthClient.label ?? t.oauthClient.clientName ?? t.name)
      : t.name;

  const rename = async (t: Token) => {
    if (!t.oauthClient) return;
    const next = await askPrompt({
      title: "Rename connection",
      description:
        "A nickname just for this list — e.g. “Roshan’s Claude” or “Work laptop”. Leave blank to fall back to the app’s own name.",
      label: "Nickname",
      placeholder: t.oauthClient.clientName ?? "Claude",
      initial: t.oauthClient.label ?? "",
      confirmLabel: "Save",
    });
    if (next === null) return;
    const res = await fetch(`/api/sysuser/oauth-clients/${t.oauthClient.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: next }),
    });
    if (!res.ok) {
      toast.error("Rename failed");
      return;
    }
    toast.success("Renamed");
    reload();
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(mcpUrl);
    toast.success("Copied to clipboard");
  };

  const formatDate = (dateStr: string | null) => {
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

  // Hide dead OAuth access tokens (they rotate hourly and expired rows are
  // noise); keep revoked/expired hand-created ones visible for history.
  const visible = tokens.filter(
    (t) => !(t.oauthClient && (t.revokedAt || isExpired(t.expiresAt))),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: "Admin" }, { label: "MCP Connections" }]}
        title="MCP Connections"
        description="AI clients (claude.ai, Claude Desktop, Claude Code, ChatGPT) connect via OAuth — add the endpoint below in the client and approve the consent screen that opens here. No manual tokens needed."
      />

      <Card>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-metal-text">
            <Lock size={14} />
            MCP endpoint
          </div>
          <div className="flex items-center gap-2 rounded border border-line bg-bone px-3 py-2">
            <code className="flex-1 font-mono text-xs break-all">
              {mcpUrl || "…"}
            </code>
            <button
              type="button"
              onClick={copyUrl}
              className="p-1 rounded hover:bg-surface transition"
              title="Copy"
            >
              <Copy size={14} />
            </button>
          </div>
          <p className="text-xs text-ink-soft">
            claude.ai: Settings → Connectors → Add custom connector. Claude
            Code:{" "}
            <code className="font-mono">
              claude mcp add --transport http shaman {mcpUrl || "<url>"}
            </code>
            . You&apos;ll be asked to sign in here and approve the connection
            with a role.
          </p>
        </div>
      </Card>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Lock size={20} />}
          title="No connections yet"
          description="Add this site as a connector in your MCP client — approved connections appear here."
        />
      ) : (
        <Card>
          <div className="space-y-2">
            {visible.map((t) => {
              const isRevoked = !!t.revokedAt;
              const expired = isExpired(t.expiresAt);
              return (
                <div
                  key={t.id}
                  className={`flex flex-wrap items-center gap-3 rounded-input border p-3 transition ${
                    isRevoked || expired
                      ? "border-line/50 bg-bone/50 opacity-50"
                      : "border-line bg-bone"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {connectionName(t)}
                      {t.oauthClient && (
                        <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-soft">
                          {shortId(t.oauthClient.clientId)}
                        </code>
                      )}
                    </div>
                    <div className="text-xs text-ink-soft space-y-0.5">
                      <div>
                        {t.oauthClient ? "Authorized" : "Created"}{" "}
                        {formatDate(t.createdAt)} by {t.createdBy}
                      </div>
                      {t.lastUsedAt && (
                        <div>Last used {formatDate(t.lastUsedAt)}</div>
                      )}
                      {t.expiresAt && !t.oauthClient && (
                        <div>
                          Expires {formatDate(t.expiresAt)}
                          {expired && " (expired)"}
                        </div>
                      )}
                    </div>
                  </div>
                  {t.oauthClient ? (
                    <Badge tone="muted">OAuth</Badge>
                  ) : (
                    <Badge tone="muted">legacy token</Badge>
                  )}
                  <Badge tone={isRevoked ? "danger" : "muted"}>
                    {isRevoked ? "revoked" : t.role}
                  </Badge>
                  {!isRevoked && t.oauthClient && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Pencil size={12} />}
                      onClick={() => rename(t)}
                    >
                      Rename
                    </Button>
                  )}
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
    </div>
  );
}
