"use client";

// Admin password reset — the only other public /sysuser route besides /login.
//
// proxy.ts has always allow-listed this exact path
// (`pathname === "/sysuser/reset"`) and both halves of the API have always
// existed (/api/sysuser/auth/request-reset and /api/sysuser/auth/reset), but
// there was no page here and no link to it from the login form. The result:
// an admin who forgot their password had no route back in at all — the flow
// was fully built and completely unreachable.
//
// One page, two modes, matching the two endpoints:
//   • no query params  → "email me a link"  → POST /request-reset
//   • ?uid=…&token=…   → "set a new password" → POST /reset
//
// The ?uid/?token parameter names are deliberately identical to the customer
// flow (app/account/reset/page.tsx, linked from
// app/api/customer/auth/request-reset/route.ts as
// `${origin}/account/reset?uid=${id}&token=${raw}`) so the two reset links
// have one shape between them.

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const FIELD_CLASS =
  "mt-1 w-full rounded-input border border-line bg-bone px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink focus:border-metal focus:outline-none focus:ring-[3px] focus:ring-metal-tint";
const LABEL_CLASS =
  "block text-[11px] font-bold uppercase tracking-wider text-ink-soft";
const BUTTON_CLASS =
  "w-full rounded-input bg-metal-deep px-4 py-2 text-sm font-bold text-bone transition hover:bg-metal-ink disabled:opacity-50";

/**
 * Mirrors the server-side policy in app/api/sysuser/auth/reset/route.ts
 * exactly (min 12 + lower + upper + digit + symbol). Duplicated on purpose:
 * the server stays authoritative, this only saves a round trip and shows the
 * admin what is actually required instead of a bare rejection.
 */
const RULES: { label: string; ok: (v: string) => boolean }[] = [
  { label: "At least 12 characters", ok: (v) => v.length >= 12 },
  { label: "A lowercase letter", ok: (v) => /[a-z]/.test(v) },
  { label: "An uppercase letter", ok: (v) => /[A-Z]/.test(v) },
  { label: "A digit", ok: (v) => /\d/.test(v) },
  { label: "A symbol", ok: (v) => /[^A-Za-z0-9]/.test(v) },
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bone text-ink">
      <div className="w-full max-w-sm space-y-4 rounded-card border border-line bg-bone p-6 shadow-card">
        {children}
      </div>
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "error" | "info";
  children: React.ReactNode;
}) {
  const cls =
    tone === "error"
      ? "border-rakta/40 bg-rakta-tint text-rakta"
      : "border-line bg-cream text-ink-soft";
  return (
    <div className={`rounded-input border p-2 text-xs ${cls}`}>{children}</div>
  );
}

function BackToLogin() {
  return (
    <Link
      href="/sysuser/login"
      className="block text-center text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
    >
      Back to sign in
    </Link>
  );
}

/** Mode A — ask for a link. */
function RequestForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sysuser/auth/request-reset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        devToken?: string;
        devUserId?: string;
      } | null;
      if (!res.ok) {
        // 400 = malformed email, 429 = the 3-per-15-minutes rate limit.
        setError(data?.message ?? "Could not request a reset link.");
        return;
      }
      // Deliberately shows whatever the server said. The server answers
      // identically whether or not the address is a real admin — do not
      // "improve" this into a confirmation that the account exists.
      setSent(data?.message ?? "If that email matches an admin account, a reset link has been issued.");
      // Non-production only: the API echoes the token so an owner can relay
      // the link by hand. It is never present in a production response.
      if (data?.devToken && data?.devUserId) {
        setDevLink(
          `/sysuser/reset?uid=${encodeURIComponent(data.devUserId)}&token=${encodeURIComponent(data.devToken)}`,
        );
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Shell>
        <h1 className="font-display text-2xl text-ink">Check your email</h1>
        <p className="text-xs text-ink-soft">{sent}</p>
        <p className="text-xs text-ink-soft">
          The link is valid for 30 minutes.
        </p>
        {devLink && (
          <Notice tone="info">
            <span className="font-bold">Development mode</span> — no mail was
            sent. Use this link:{" "}
            <Link href={devLink} className="break-all underline">
              {devLink}
            </Link>
          </Notice>
        )}
        <BackToLogin />
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-4">
        <h1 className="font-display text-2xl text-ink">Reset your password</h1>
        <p className="text-xs text-ink-soft">
          Enter the email on your admin account and we&rsquo;ll send a link to
          set a new password.
        </p>
        <label className={LABEL_CLASS}>
          Email
          <input
            type="email"
            required
            autoFocus
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <button type="submit" disabled={busy} className={BUTTON_CLASS}>
          {busy ? "Sending…" : "Send reset link"}
        </button>
        <BackToLogin />
      </form>
    </Shell>
  );
}

/** Mode B — a link was followed; set the new password. */
function SetPasswordForm({ uid, token }: { uid: string; token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const failing = useMemo(
    () => RULES.filter((r) => !r.ok(password)),
    [password],
  );
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = failing.length === 0 && !mismatch && confirm.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sysuser/auth/reset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid, token, newPassword: password }),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
      } | null;
      if (!res.ok) {
        setError(data?.message ?? "Reset failed.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Shell>
        <h1 className="font-display text-2xl text-ink">Password changed</h1>
        <p className="text-xs text-ink-soft">
          Every other reset link for this account has been invalidated. Sign in
          with your new password.
        </p>
        <Link href="/sysuser/login" className={`${BUTTON_CLASS} block text-center`}>
          Go to sign in
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-4">
        <h1 className="font-display text-2xl text-ink">Set a new password</h1>
        <label className={LABEL_CLASS}>
          New password
          <input
            type="password"
            required
            autoFocus
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <label className={LABEL_CLASS}>
          Confirm new password
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={FIELD_CLASS}
          />
        </label>
        <ul className="space-y-1 text-[11px] text-ink-soft">
          {RULES.map((r) => {
            const ok = r.ok(password);
            return (
              <li key={r.label} className={ok ? "text-metal-text" : undefined}>
                <span aria-hidden="true">{ok ? "✓" : "•"}</span> {r.label}
              </li>
            );
          })}
        </ul>
        {mismatch && <Notice tone="error">Passwords do not match.</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <button
          type="submit"
          disabled={busy || !canSubmit}
          className={BUTTON_CLASS}
        >
          {busy ? "Saving…" : "Set new password"}
        </button>
        <BackToLogin />
      </form>
    </Shell>
  );
}

function ResetInner() {
  const params = useSearchParams();
  const uid = params.get("uid");
  const token = params.get("token");

  // A half-filled link is a broken link, not a request form — say so rather
  // than silently dropping the admin into "email me again".
  if ((uid && !token) || (!uid && token)) {
    return (
      <Shell>
        <h1 className="font-display text-2xl text-ink">Link is incomplete</h1>
        <Notice tone="error">
          This reset link is missing part of its address. Request a new one.
        </Notice>
        <Link href="/sysuser/reset" className={`${BUTTON_CLASS} block text-center`}>
          Request a new link
        </Link>
        <BackToLogin />
      </Shell>
    );
  }

  if (uid && token) return <SetPasswordForm uid={uid} token={token} />;
  return <RequestForm />;
}

export default function ResetPage() {
  // useSearchParams needs a Suspense boundary — same shape as the login page.
  return (
    <Suspense fallback={<div className="min-h-screen bg-bone" />}>
      <ResetInner />
    </Suspense>
  );
}
