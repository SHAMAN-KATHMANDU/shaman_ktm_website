"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import { Badge } from "@/components/site/shared/badge";
import { useAuth } from "@/context/auth-context";
import { listKeysWithPrefix, readJson } from "@/lib/storage";
import { formatDate, formatNpr } from "@/lib/format";
import type { Order } from "@/lib/api/types";

function DashboardInner() {
  const router = useRouter();
  const { user, hydrated, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const keys = listKeysWithPrefix("sk:orders:").filter(
      (k) => k !== "sk:orders:last",
    );
    const list = keys
      .map((k) => readJson<Order>(k))
      .filter((o): o is Order => !!o)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setOrders(list);
  }, []);

  useEffect(() => {
    if (hydrated && !user) router.replace("/account/login");
  }, [hydrated, user, router]);

  if (!hydrated) {
    return (
      <section className="px-6 py-20 text-center text-[var(--color-gold-muted)]">
        Loading…
      </section>
    );
  }
  if (!user) return null;

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1100px] py-12">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-12">
        <div>
          <p className="label-eyebrow mb-2">Account</p>
          <h1 className="font-display text-4xl text-[var(--color-cream)]">
            Welcome, {user.name}
          </h1>
          <p className="text-sm text-[var(--color-gold-muted)] mt-1">
            {user.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={user.memberStatus === "member" ? "member" : "default"}>
            {user.memberStatus === "member" ? "Member" : "Guest"}
          </Badge>
          <Button onClick={logout} variant="ghost">
            Logout
          </Button>
        </div>
      </header>

      <h2 className="font-display text-2xl text-[var(--color-cream)] mb-6">
        Your orders
      </h2>
      {orders.length === 0 ? (
        <div className="border border-[var(--color-border)] p-10 text-center">
          <p className="text-[var(--color-gold-muted)] mb-6">
            No orders yet. Once you place one, it shows up here.
          </p>
          <Button href="/nature" variant="primary">
            Browse Nature
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.number}
              className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div>
                <p className="font-display text-lg text-[var(--color-gold)]">
                  {o.number}
                </p>
                <p className="text-xs text-[var(--color-gold-muted)] mt-1">
                  {formatDate(o.createdAt)} · {o.items.length}{" "}
                  {o.items.length === 1 ? "item" : "items"} · {o.payment.method}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[var(--color-cream)] font-display text-xl">
                  {formatNpr(o.total)}
                </p>
                <p className="text-xs text-[var(--color-gold-muted)] capitalize">
                  {o.payment.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  return (
    <SiteProviders>
      <SiteShell>
        <DashboardInner />
      </SiteShell>
    </SiteProviders>
  );
}
