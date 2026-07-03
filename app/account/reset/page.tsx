"use client";

import { useState } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import { useToast } from "@/context/toast-context";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { splitLocale } from "@/lib/i18n/locale";
import { LocaleLink } from "@/components/site/locale-link";

function ResetForm() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const toast = useToast();

  const userId = searchParams.get("uid");
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.show(t.account.reset.passwordRequired, { variant: "error" });
      return;
    }
    if (password !== confirmPassword) {
      toast.show(t.account.reset.passwordMismatch, { variant: "error" });
      return;
    }
    if (password.length < 8) {
      toast.show(t.account.reset.passwordTooShort, { variant: "error" });
      return;
    }
    if (!userId || !token) {
      toast.show(t.account.reset.invalidLink, { variant: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/customer/auth/reset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          token,
          newPassword: password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        toast.show(t.account.reset.success, { variant: "success" });
      } else {
        toast.show(data.message || t.account.reset.failed, { variant: "error" });
      }
    } catch {
      toast.show(t.common.networkError, { variant: "error" });
    }
    setLoading(false);
  };

  if (success) {
    return (
      <section className="px-6 py-20 mx-auto max-w-[420px]">
        <h1 className="font-display text-4xl text-[var(--color-cream)] mb-6 text-center">
          {t.account.reset.success}
        </h1>
        <p className="text-center text-[var(--color-gold-muted)] mb-8">
          {t.account.reset.successMessage}
        </p>
        <LocaleLink href="/account/login" className="block">
          <Button variant="primary" size="lg" className="w-full">
            {t.account.reset.backToLogin}
          </Button>
        </LocaleLink>
      </section>
    );
  }

  return (
    <section className="px-6 py-20 mx-auto max-w-[420px]">
      <h1 className="font-display text-4xl text-[var(--color-cream)] mb-2 text-center">
        {t.account.reset.title}
      </h1>
      <p className="text-center text-[var(--color-gold-muted)] mb-10 text-sm">
        {t.account.reset.subtitle}
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-password" className="label-eyebrow block mb-2">
            {t.account.reset.password}
          </label>
          <input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-gold)] outline-none px-4 py-3 text-[var(--color-cream)] disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="reset-confirm" className="label-eyebrow block mb-2">
            {t.account.reset.confirmPassword}
          </label>
          <input
            id="reset-confirm"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-gold)] outline-none px-4 py-3 text-[var(--color-cream)] disabled:opacity-50"
          />
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? t.common.loading : t.account.reset.submit}
        </Button>
      </form>
    </section>
  );
}

export default function ResetPage() {
  return (
    <SiteProviders>
      <SiteShell>
        <ResetForm />
      </SiteShell>
    </SiteProviders>
  );
}
