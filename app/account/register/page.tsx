"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";

function RegisterForm() {
  const router = useRouter();
  const auth = useAuth();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password) {
      toast.show("Name, email, and password are required", { variant: "error" });
      return;
    }
    auth.register({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
    });
    toast.show("Welcome to Shaman Kathmandu", { variant: "success" });
    router.push("/account/dashboard");
  };

  return (
    <section className="px-6 py-20 mx-auto max-w-[420px]">
      <h1 className="font-display text-4xl text-[var(--color-cream)] mb-2 text-center">
        Create an account
      </h1>
      <p className="text-center text-[var(--color-gold-muted)] mb-10 text-sm">
        Profiles save locally for now and migrate when our API key arrives.
      </p>
      <form
        onSubmit={onSubmit}
        className="space-y-4"
        aria-label="Register form"
      >
        <Field
          label="Full name"
          id="reg-name"
          autoComplete="name"
          value={name}
          onChange={setName}
        />
        <Field
          label="Email"
          id="reg-email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          type="email"
        />
        <Field
          label="Phone (optional)"
          id="reg-phone"
          autoComplete="tel"
          value={phone}
          onChange={setPhone}
        />
        <Field
          label="Password"
          id="reg-password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          type="password"
        />
        <Button variant="primary" size="lg" className="w-full">
          Create account
        </Button>
      </form>
      <p className="text-center text-sm mt-8 text-[var(--color-gold-muted)]">
        Already a member?{" "}
        <Link href="/account/login" className="text-[var(--color-gold)] hover:underline">
          Login
        </Link>
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
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
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
        className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-gold)] outline-none px-4 py-3 text-[var(--color-cream)]"
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
