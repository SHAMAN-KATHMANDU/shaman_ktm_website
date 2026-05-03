"use client";

import { useState } from "react";
import { Button, Field, TextInput } from "@/components/sysuser/form";

export default function AccountPage() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(
    null,
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword.length < 8) {
      setMsg({ kind: "err", text: "New password must be at least 8 characters" });
      return;
    }
    if (newPassword !== confirm) {
      setMsg({ kind: "err", text: "Passwords don't match" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sysuser/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: "err", text: j.message ?? "Failed to change password" });
      } else {
        setMsg({ kind: "ok", text: "Password updated." });
        setCurrent("");
        setNew("");
        setConfirm("");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md">
      <h1 className="font-display text-2xl text-[var(--color-gold)]">Account</h1>
      <p className="mt-1 text-sm opacity-70">
        Change your sign-in password. The bootstrap password is{" "}
        <code>changeme</code> — replace it on first login.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Current password">
          <TextInput
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field label="New password">
          <TextInput
            type="password"
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Field label="Confirm new password">
          <TextInput
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>

        {msg && (
          <p
            className={`text-sm ${
              msg.kind === "ok"
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            {msg.text}
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
