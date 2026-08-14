"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/site/shared/button";
import { useToast } from "@/context/toast-context";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { splitLocale } from "@/lib/i18n/locale";
import { LocaleLink } from "@/components/site/locale-link";

function ForgotForm() {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.show(t.account.forgot.emailRequired, { variant: "error" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/customer/auth/request-reset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        // In dev mode, show the reset URL if available
        if (data.devResetUrl) {
          setDevUrl(data.devResetUrl);
        }
      } else {
        toast.show(data.message || t.account.forgot.failed, { variant: "error" });
      }
    } catch {
      toast.show(t.common.networkError, { variant: "error" });
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <section className="px-6 py-20 mx-auto max-w-[420px]">
        <h1 className="font-display text-4xl text-ink mb-6 text-center">
          {t.account.forgot.sent}
        </h1>
        <p className="text-center text-ink-soft mb-8">
          {t.account.forgot.checkEmail}
        </p>
        {devUrl && (
          <div className="mb-8 p-4 bg-surface border border-metal rounded-card">
            <p className="text-xs text-ink-soft mb-2">Dev: Reset link</p>
            <a
              href={devUrl}
              className="text-metal-text hover:underline break-all text-sm"
            >
              {devUrl}
            </a>
          </div>
        )}
        <LocaleLink href="/account/login" className="block">
          <Button variant="primary" size="lg" className="w-full">
            {t.account.forgot.backToLogin}
          </Button>
        </LocaleLink>
      </section>
    );
  }

  return (
    <section className="px-6 py-20 mx-auto max-w-[420px]">
      <h1 className="font-display text-4xl text-ink mb-2 text-center">
        {t.account.forgot.title}
      </h1>
      <p className="text-center text-ink-soft mb-10 text-sm">
        {t.account.forgot.subtitle}
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="forgot-email" className="label-eyebrow block mb-2">
            {t.account.forgot.email}
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full bg-bone border border-line rounded-input focus:border-accent outline-none px-4 py-3 text-ink disabled:opacity-50"
          />
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? t.common.loading : t.account.forgot.submit}
        </Button>
      </form>
      <p className="text-center text-sm mt-8 text-ink-soft">
        <LocaleLink href="/account/login" className="text-metal-text hover:underline">
          {t.account.forgot.backToLogin}
        </LocaleLink>
      </p>
    </section>
  );
}

export default function ForgotPage() {
  return (
    <ForgotForm />
  );
}
