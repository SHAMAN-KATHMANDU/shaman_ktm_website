"use client";

// OAuth consent screen. Reached via a 302 from /api/oauth/authorize (behind
// the sysuser login like every (authed) page). Approving mints a single-use
// code and sends the browser back to the connector's redirect_uri.

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Lock, ShieldCheck, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

interface ConsentDetails {
  clientName: string;
  redirectHost: string;
  scope: string;
  expiresAt: string;
  actingAs: string;
}

function ConsentInner() {
  const params = useSearchParams();
  const toast = useToast();
  const requestId = params.get("request_id");

  const [details, setDetails] = useState<ConsentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!requestId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Missing request_id — start the connection from your MCP client.");
      return;
    }
    let cancelled = false;
    fetch(`/api/sysuser/oauth-consent/${requestId}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as {
            message?: string;
          } | null;
          setError(
            j?.message ??
              "This authorization request is no longer valid. Retry from your MCP client.",
          );
          return;
        }
        setDetails((await res.json()) as ConsentDetails);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load the authorization request.");
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const decide = async (approved: boolean) => {
    setBusy(true);
    const res = await fetch(`/api/sysuser/oauth-consent/${requestId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved, role }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      toast.error("Decision failed", j?.message ?? undefined);
      return;
    }
    const { redirectTo } = (await res.json()) as { redirectTo: string };
    setDone(true);
    window.location.href = redirectTo;
  };

  if (error) {
    return (
      <Card>
        <div className="flex items-center gap-3 text-sm">
          <X size={16} className="text-rakta" />
          {error}
        </div>
      </Card>
    );
  }

  if (!details) {
    return (
      <Card>
        <div className="text-sm text-ink-soft">Loading authorization request…</div>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-metal-text" />
            <div>
              <h1 className="font-display text-xl text-metal-text">
                Authorize MCP access
              </h1>
              <p className="text-xs text-ink-soft">
                An MCP client is asking to connect to the Shaman Kathmandu CMS.
              </p>
            </div>
          </div>

          <div className="space-y-2 rounded border border-line bg-bone p-4 text-sm">
            <div>
              <span className="text-ink-soft">Client:</span>{" "}
              <span className="font-medium">{details.clientName}</span>
            </div>
            <div>
              <span className="text-ink-soft">Returns to:</span>{" "}
              <code className="text-xs">{details.redirectHost}</code>
            </div>
            <div>
              <span className="text-ink-soft">Scope:</span>{" "}
              <code className="text-xs">{details.scope}</code>
            </div>
            <div>
              <span className="text-ink-soft">Acting as:</span>{" "}
              {details.actingAs}
            </div>
          </div>

          <Field
            label="Granted role"
            hint="What the connected client will be allowed to do. Tokens can be revoked anytime at MCP Tokens."
          >
            <Select
              value={role}
              onChange={(v) => setRole(v as "owner" | "editor" | "viewer")}
              options={[
                { value: "viewer", label: "Viewer (read-only)" },
                { value: "editor", label: "Editor (default)" },
                { value: "owner", label: "Owner (full access)" },
              ]}
            />
          </Field>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              disabled={busy || done}
              onClick={() => decide(false)}
            >
              Deny
            </Button>
            <Button
              icon={<Lock size={12} />}
              disabled={busy || done}
              onClick={() => decide(true)}
            >
              {done ? "Redirecting…" : busy ? "Working…" : "Approve"}
            </Button>
          </div>
        </div>
      </Card>
      <p className="text-center text-xs text-ink-soft">
        Approval issues short-lived access tokens managed like any other MCP
        token — see the MCP Tokens page to review or revoke them.
      </p>
    </div>
  );
}

export default function OAuthConsentClient() {
  return (
    <Suspense fallback={<div className="text-sm text-ink-soft">Loading…</div>}>
      <ConsentInner />
    </Suspense>
  );
}
