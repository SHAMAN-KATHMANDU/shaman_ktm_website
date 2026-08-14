"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { splitLocale, localizeHref } from "@/lib/i18n/locale";
import { LocaleLink } from "@/components/site/locale-link";

function RegisterForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);

  // Same same-site-only validation as the login page; `next` arrives with any
  // /ne prefix already applied (it's the original pathname from the proxy).
  const nextPath = searchParams.get("next");
  const validatedNext =
    nextPath && /^\/(?!\/)/.test(nextPath) && !nextPath.includes("://")
      ? nextPath
      : localizeHref("/account/dashboard", locale);

  const auth = useAuth();
  const toast = useToast();

  // Already signed in (e.g. followed a stale register link) — skip the form.
  useEffect(() => {
    if (auth.hydrated && auth.user) router.replace(validatedNext);
  }, [auth.hydrated, auth.user, router, validatedNext]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.show(t.account.register.requiredFields, { variant: "error" });
      return;
    }
    if (password !== confirmPassword) {
      toast.show(t.account.register.passwordMismatch, { variant: "error" });
      return;
    }
    if (password.length < 8) {
      toast.show(t.account.register.passwordTooShort, { variant: "error" });
      return;
    }
    setLoading(true);
    const result = await auth.register({
      name: name.trim(),
      email: email.trim(),
      password,
      phone: phone.trim() || undefined,
    });
    setLoading(false);
    if (result.ok) {
      toast.show(t.account.register.success, { variant: "success" });
      router.push(validatedNext);
    } else {
      toast.show(result.message || t.account.register.failed, { variant: "error" });
    }
  };

  return (
    <section className="px-6 py-20 mx-auto max-w-[420px]">
      <h1 className="font-display text-4xl text-ink mb-2 text-center">
        {t.account.register.title}
      </h1>
      <p className="text-center text-ink-soft mb-10 text-sm">
        {t.account.register.subtitle}
      </p>
      <form onSubmit={onSubmit} className="space-y-4" aria-label="Register form">
        <Field
          label={t.account.register.name}
          id="reg-name"
          autoComplete="name"
          value={name}
          onChange={setName}
          disabled={loading}
        />
        <Field
          label={t.account.register.email}
          id="reg-email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          type="email"
          disabled={loading}
        />
        <Field
          label={t.account.register.phone}
          id="reg-phone"
          autoComplete="tel"
          value={phone}
          onChange={setPhone}
          disabled={loading}
        />
        <Field
          label={t.account.register.password}
          id="reg-password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          type="password"
          disabled={loading}
        />
        <Field
          label={t.account.register.confirmPassword}
          id="reg-confirm-password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          type="password"
          disabled={loading}
        />
        <Button variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? t.common.loading : t.account.register.submit}
        </Button>
      </form>
      <p className="text-center text-sm mt-8 text-ink-soft">
        {t.account.register.haveAccount}{" "}
        <LocaleLink
          href={
            nextPath
              ? `/account/login?next=${encodeURIComponent(nextPath)}`
              : "/account/login"
          }
          className="text-metal-text hover:underline"
        >
          {t.account.register.login}
        </LocaleLink>
      </p>
    </section>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  type = "text",
  autoComplete,
  disabled = false,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-eyebrow block mb-2">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full bg-bone border border-line rounded-input focus:border-accent outline-none px-4 py-3 text-ink disabled:opacity-50"
      />
    </div>
  );
}

export default function RegisterPage() {
  return (
    <SiteProviders>
      <SiteShell>
        <RegisterForm />
      </SiteShell>
    </SiteProviders>
  );
}
