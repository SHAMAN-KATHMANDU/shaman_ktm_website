"use client";

// MCP Connections. Clients connect via the OAuth 2.1 flow (they register
// themselves, then land on /sysuser/oauth-consent for approval) — there is no
// manual token provisioning here anymore. This page shows the endpoint to
// paste into a client plus every active connection, each revocable.
// (The route keeps its /sysuser/mcp-tokens path; connections are McpToken
// rows underneath.)

import { useEffect, useState } from "react";
import { Copy, Lock, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  /** Set when the token was minted by the OAuth flow (remote connectors). */
  oauthClient: { clientName: string | null; clientId: string } | null;
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
      title: `Revoke "${t.name}"?`,
      description:
        "The connected client will lose access immediately and must re-authorize. This cannot be undone.",
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
    toast.success("Connection revoked");
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
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--color-gold)]">
            <Lock size={14} />
            MCP endpoint
          </div>
          <div className="flex items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2">
            <code className="flex-1 font-mono text-xs break-all">
              {mcpUrl || "…"}
            </code>
            <button
              type="button"
              onClick={copyUrl}
              className="p-1 rounded hover:bg-[var(--color-surface)] transition"
              title="Copy"
            >
              <Copy size={14} />
            </button>
          </div>
          <p className="text-xs opacity-60">
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
                  className={`flex flex-wrap items-center gap-3 rounded-md border p-3 transition ${
                    isRevoked || expired
                      ? "border-[var(--color-border)]/50 bg-[var(--color-base)]/50 opacity-50"
                      : "border-[var(--color-border)] bg-[var(--color-base)]"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {t.oauthClient
                        ? (t.oauthClient.clientName ?? t.name)
                        : t.name}
                    </div>
                    <div className="text-xs opacity-70 space-y-0.5">
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
