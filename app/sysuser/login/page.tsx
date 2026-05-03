"use client";

import { Suspense, useState } from "react";
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
    router.push(params.get("from") ?? "/sysuser");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-base)] text-[var(--color-cream)]">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <h1 className="font-display text-2xl text-[var(--color-gold)]">
          Shaman CMS
        </h1>
        <p className="text-xs opacity-60">Sign in to manage content.</p>
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[var(--color-gold)] focus:outline-none"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-[var(--color-border)] bg-[var(--color-base)] px-3 py-2 text-sm focus:border-[var(--color-gold)] focus:outline-none"
          />
        </label>
        {error && (
          <div className="rounded bg-[var(--color-danger)]/20 p-2 text-xs text-[var(--color-danger)]">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-[var(--color-base)] disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[var(--color-base)]" />}
    >
      <LoginInner />
    </Suspense>
  );
}
