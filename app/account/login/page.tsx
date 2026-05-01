"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";

function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.show("Email and password required", { variant: "error" });
      return;
    }
    auth.login({ email: email.trim() });
    toast.show("Welcome back", { variant: "success" });
    router.push("/account/dashboard");
  };

  return (
    <section className="px-6 py-20 mx-auto max-w-[420px]">
      <h1 className="font-display text-4xl text-[var(--color-cream)] mb-2 text-center">
        Welcome back
      </h1>
      <p className="text-center text-[var(--color-gold-muted)] mb-10 text-sm">
        Login is local only for now. Any email and password works.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="label-eyebrow block mb-2">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-gold)] outline-none px-4 py-3 text-[var(--color-cream)]"
          />
        </label>
        <label className="block">
          <span className="label-eyebrow block mb-2">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-gold)] outline-none px-4 py-3 text-[var(--color-cream)]"
          />
        </label>
        <Button variant="primary" size="lg" className="w-full">
          Login
        </Button>
      </form>
      <p className="text-center text-sm mt-8 text-[var(--color-gold-muted)]">
        Don't have an account?{" "}
        <Link href="/account/register" className="text-[var(--color-gold)] hover:underline">
          Register
        </Link>
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
