"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { splitLocale, localizeHref } from "@/lib/i18n/locale";
import { usePathname } from "next/navigation";
import { LocaleLink } from "@/components/site/locale-link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const auth = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Only allow same-site redirects: a single leading slash ("//evil.com" and
  // "https://…" are external), no scheme anywhere. The proxy builds `next`
  // from the original pathname, so it already carries any /ne prefix; the
  // fallback has to add it itself.
  const nextPath = searchParams.get("next");
  const validatedNext =
    nextPath && /^\/(?!\/)/.test(nextPath) && !nextPath.includes("://")
      ? nextPath
      : localizeHref("/account/dashboard", locale);

  // Already signed in (e.g. followed a stale login link) — skip the form.
  useEffect(() => {
    if (auth.hydrated && auth.user) router.replace(validatedNext);
  }, [auth.hydrated, auth.user, router, validatedNext]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.show(t.account.login.requiredFields, { variant: "error" });
      return;
    }
    setLoading(true);
    const result = await auth.login(email.trim(), password);
    setLoading(false);
    if (result.ok) {
      toast.show(t.account.login.success, { variant: "success" });
      router.push(validatedNext);
    } else {
      toast.show(result.message || t.account.login.failed, { variant: "error" });
    }
  };

  return (
    <section className="px-6 py-20 mx-auto max-w-[420px]">
      <h1 className="font-display text-4xl text-[var(--color-cream)] mb-2 text-center">
        {t.account.login.title}
      </h1>
      <p className="text-center text-[var(--color-gold-muted)] mb-10 text-sm">
        {t.account.login.subtitle}
      </p>
      <form onSubmit={onSubmit} className="space-y-4" aria-label="Login form">
        <div>
          <label htmlFor="login-email" className="label-eyebrow block mb-2">
            {t.account.login.email}
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-gold)] outline-none px-4 py-3 text-[var(--color-cream)] disabled:opacity-50"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="label-eyebrow block mb-2">
            {t.account.login.password}
          </label>
          <input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-gold)] outline-none px-4 py-3 text-[var(--color-cream)] disabled:opacity-50"
          />
        </div>
        <Button variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? t.common.loading : t.account.login.submit}
        </Button>
      </form>
      <p className="text-center text-sm mt-4 text-[var(--color-gold-muted)]">
        <LocaleLink href="/account/forgot" className="text-[var(--color-gold)] hover:underline">
          {t.account.login.forgotPassword}
        </LocaleLink>
      </p>
      <p className="text-center text-sm mt-6 text-[var(--color-gold-muted)]">
        {t.account.login.noAccount}{" "}
        <LocaleLink
          href={
            nextPath
              ? `/account/register?next=${encodeURIComponent(nextPath)}`
              : "/account/register"
          }
          className="text-[var(--color-gold)] hover:underline"
        >
          {t.account.login.register}
        </LocaleLink>
      </p>
    </section>
  );
}

export default function LoginPage() {
  return (
    <SiteProviders>
      <SiteShell>
        <LoginForm />
      </SiteShell>
    </SiteProviders>
  );
}
