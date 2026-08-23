"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/sysuser/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(j?.message ?? "Login failed");
      return;
    }
    // Same-origin paths only — "//host" would be treated as protocol-relative.
    const from = params.get("from");
    const safeFrom =
      from && from.startsWith("/") && !from.startsWith("//") ? from : "/sysuser";
    router.push(safeFrom);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bone text-ink">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-card border border-line bg-bone p-6 shadow-card"
      >
        <h1 className="font-display text-2xl text-ink">
          Shaman CMS
        </h1>
        <p className="text-xs text-ink-soft">Sign in to manage content.</p>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Email
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-input border border-line bg-bone px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink focus:border-metal focus:outline-none focus:ring-[3px] focus:ring-metal-tint"
          />
        </label>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-soft">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-input border border-line bg-bone px-3 py-2 text-sm font-normal normal-case tracking-normal text-ink focus:border-metal focus:outline-none focus:ring-[3px] focus:ring-metal-tint"
          />
        </label>
        {error && (
          <div className="rounded-input border border-rakta/40 bg-rakta-tint p-2 text-xs text-rakta">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-input bg-metal-deep px-4 py-2 text-sm font-bold text-bone transition hover:bg-metal-ink disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {/* The only entry point into /sysuser/reset. Without it the reset
            flow is unreachable — which is exactly the state this repo was in:
            proxy.ts allow-listed the path and both API halves existed, but
            nothing ever linked to them. */}
        <Link
          href="/sysuser/reset"
          className="block text-center text-xs text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          Forgot your password?
        </Link>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-bone" />}
    >
      <LoginInner />
    </Suspense>
  );
}
