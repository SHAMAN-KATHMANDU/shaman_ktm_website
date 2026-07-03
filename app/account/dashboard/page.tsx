"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatDate, formatNpr } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { splitLocale, localizeHref } from "@/lib/i18n/locale";
import { LocaleLink } from "@/components/site/locale-link";
import type { Order, OrderStatus } from "@/lib/api/types";

function DashboardInner() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const toast = useToast();
  const { user, hydrated, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace(localizeHref("/account/login", locale));
    }
  }, [hydrated, user, router, locale]);

  useEffect(() => {
    if (user) {
      const fetchOrders = async () => {
        setLoadingOrders(true);
        try {
          const res = await fetch("/api/customer/orders?page=1&limit=50", {
            credentials: "same-origin",
          });
          if (res.ok) {
            const data = await res.json();
            setOrders(data.orders || []);
          } else if (res.status !== 401) {
            toast.show(t.account.dashboard.loadFailed, { variant: "error" });
          }
        } catch {
          toast.show(t.common.networkError, { variant: "error" });
        }
        setLoadingOrders(false);
      };
      fetchOrders();
    }
  }, [user, toast]);

  const handleLogout = async () => {
    await logout();
    router.replace(localizeHref("/account/login", locale));
  };

  const getStatusLabel = (status: OrderStatus) => {
    const statusMap: Record<OrderStatus, string> = {
      pending: t.account.orderStatuses.pending,
      confirmed: t.account.orderStatuses.confirmed,
      shipped: t.account.orderStatuses.shipped,
      delivered: t.account.orderStatuses.delivered,
      cancelled: t.account.orderStatuses.cancelled,
    };
    return statusMap[status] || status;
  };

  if (!hydrated) {
    return (
      <section className="px-6 py-20 text-center text-[var(--color-gold-muted)]">
        {t.common.loading}
      </section>
    );
  }
  if (!user) return null;

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1100px] py-12">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-12">
        <div>
          <p className="label-eyebrow mb-2">{t.account.dashboard.title}</p>
          <h1 className="font-display text-4xl text-[var(--color-cream)]">
            {t.account.dashboard.greeting.replace("{name}", user.name)}
          </h1>
          <p className="text-sm text-[var(--color-gold-muted)] mt-1">
            {user.email}
          </p>
          {user.phone && (
            <p className="text-sm text-[var(--color-gold-muted)]">
              {user.phone}
            </p>
          )}
        </div>
        <Button onClick={handleLogout} variant="ghost">
          {t.account.dashboard.logout}
        </Button>
      </header>

      <h2 className="font-display text-2xl text-[var(--color-cream)] mb-6">
        {t.account.dashboard.yourOrders}
      </h2>
      {loadingOrders ? (
        <div className="text-center text-[var(--color-gold-muted)]">
          {t.common.loading}
        </div>
      ) : orders.length === 0 ? (
        <div className="border border-[var(--color-border)] p-10 text-center">
          <p className="text-[var(--color-gold-muted)] mb-6">
            {t.account.dashboard.noOrders}
          </p>
          <LocaleLink href="/products">
            <Button variant="primary">
              {t.account.dashboard.browseProducts}
            </Button>
          </LocaleLink>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <LocaleLink
              key={o.number}
              href={`/account/orders/${o.number}`}
              className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:border-[var(--color-gold)] transition-colors block"
            >
              <div>
                <p className="font-display text-lg text-[var(--color-gold)]">
                  {o.number}
                </p>
                <p className="text-xs text-[var(--color-gold-muted)] mt-1">
                  {formatDate(o.createdAt)} · {o.items.length}{" "}
                  {o.items.length === 1 ? t.cart.item : t.cart.items} · {o.payment.method}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[var(--color-cream)] font-display text-xl">
                  {formatNpr(o.total)}
                </p>
                <p className="text-xs text-[var(--color-gold-muted)]">
                  {getStatusLabel(o.status)}
                </p>
              </div>
            </LocaleLink>
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
