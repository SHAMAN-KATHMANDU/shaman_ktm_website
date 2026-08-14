"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/site/shared/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatDate, formatNpr } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { splitLocale, localizeHref } from "@/lib/i18n/locale";
import { LocaleLink } from "@/components/site/locale-link";
import {
  StatusPill,
  ORDER_STATUS_TONE,
} from "@/components/shared/status-pill";
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
          } else if (res.status === 401) {
            // Session expired between the guard above and this request.
            // Showing an empty list would read as "your orders are gone".
            router.replace(
              localizeHref("/account/login?next=/account/dashboard", locale),
            );
          } else {
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
      <section className="px-6 py-20 text-center text-ink-soft">
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
          <h1 className="font-display text-4xl text-ink">
            {t.account.dashboard.greeting.replace("{name}", user.name)}
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            {user.email}
          </p>
          {user.phone && (
            <p className="text-sm text-ink-soft">
              {user.phone}
            </p>
          )}
        </div>
        <Button onClick={handleLogout} variant="ghost">
          {t.account.dashboard.logout}
        </Button>
      </header>

      <h2 className="font-display text-2xl text-ink mb-6">
        {t.account.dashboard.yourOrders}
      </h2>
      {loadingOrders ? (
        <div className="text-center text-ink-soft">
          {t.common.loading}
        </div>
      ) : orders.length === 0 ? (
        <div className="border border-line bg-surface p-10 text-center rounded-card">
          <p className="text-ink-soft mb-6">
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
              className="border border-line bg-surface p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:border-metal transition-colors block rounded-card"
            >
              <div>
                <p className="font-display text-lg text-metal-text">
                  {o.number}
                </p>
                <p className="text-xs text-ink-soft mt-1">
                  {formatDate(o.createdAt)} · {o.items.length}{" "}
                  {o.items.length === 1 ? t.cart.item : t.cart.items} · {o.payment.method}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-xl text-ink tabular-nums">
                  {formatNpr(o.total)}
                </p>
                <StatusPill tone={ORDER_STATUS_TONE[o.status] ?? "neutral"}>
                  {getStatusLabel(o.status)}
                </StatusPill>
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
    <DashboardInner />
  );
}
