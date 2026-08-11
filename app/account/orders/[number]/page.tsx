"use client";

import { use, useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/site/shared/button";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatDate, formatNpr } from "@/lib/format";
import { buildEnquireUrl } from "@/lib/whatsapp";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { splitLocale, localizeHref } from "@/lib/i18n/locale";
import { LocaleLink } from "@/components/site/locale-link";
import type {
  Order,
  OrderStatus,
  DeliveryZone,
  PaymentMethod,
} from "@/lib/api/types";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  esewa: "eSewa",
  khalti: "Khalti",
  cod: "Cash on delivery",
  bank: "Bank transfer",
};

function OrderDetailInner({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const toast = useToast();
  const { user, hydrated } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const placed = searchParams.get("placed") === "1";

  useEffect(() => {
    if (hydrated && !user) {
      router.replace(localizeHref("/account/login", locale));
    }
  }, [hydrated, user, router, locale]);

  useEffect(() => {
    if (user && orderNumber) {
      const fetchOrder = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/customer/orders/${orderNumber}`, {
            credentials: "same-origin",
          });
          if (res.ok) {
            const data = await res.json();
            setOrder(data.order);
          } else if (res.status === 404) {
            setOrder(null);
          } else {
            toast.show(t.account.orders.loadFailed, { variant: "error" });
          }
        } catch {
          toast.show(t.common.networkError, { variant: "error" });
        }
        setLoading(false);
      };
      fetchOrder();
    }
  }, [user, orderNumber, toast, locale]);

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

  const getZoneLabel = (zone: DeliveryZone) => {
    const zoneMap: Record<DeliveryZone, string> = {
      thamel: t.account.deliveryZones.thamel,
      jhamsikhel: t.account.deliveryZones.jhamsikhel,
      gongabu: t.account.deliveryZones.gongabu,
      shipping: t.account.deliveryZones.shipping,
    };
    return zoneMap[zone] || zone;
  };

  if (!hydrated || loading) {
    return (
      <section className="px-6 py-20 text-center text-[var(--color-gold-muted)]">
        {t.common.loading}
      </section>
    );
  }
  if (!user) return null;

  if (order === null) {
    return (
      <section className="px-6 md:px-10 mx-auto max-w-[700px] py-20 text-center">
        <h1 className="font-display text-3xl text-[var(--color-cream)] mb-4">
          {t.account.orders.notFound}
        </h1>
        <p className="text-[var(--color-gold-muted)] mb-8">
          {t.account.orders.notFoundMessage}
        </p>
        <LocaleLink href="/account/dashboard">
          <Button variant="primary">
            {t.account.orders.backToDashboard}
          </Button>
        </LocaleLink>
      </section>
    );
  }

  const enquireUrl = buildEnquireUrl({
    message: t.account.orders.enquireMessage.replace("{number}", order.number),
  });

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[900px] py-12">
      {placed && (
        <div className="mb-6 p-4 bg-[var(--color-gold)]/15 border border-[var(--color-gold)] text-[var(--color-gold)]">
          <p className="font-semibold">{t.checkout.orderPlaced}</p>
        </div>
      )}

      <LocaleLink
        href="/account/dashboard"
        className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold-muted)] hover:text-[var(--color-gold)] inline-block"
      >
        ← {t.account.orders.backToDashboard}
      </LocaleLink>

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6 mb-10">
        <div>
          <p className="label-eyebrow mb-2">{t.account.orders.title}</p>
          <h1 className="font-display text-4xl text-[var(--color-cream)]">
            {order.number}
          </h1>
          <p className="text-sm text-[var(--color-gold-muted)] mt-1">
            {t.account.orders.placedOn.replace("{date}", formatDate(order.createdAt))}
          </p>
        </div>
        <span
          className={`label-nav text-[11px] px-4 py-2 border self-start md:self-center ${
            order.status === "cancelled"
              ? "border-[var(--color-border)] text-[var(--color-gold-muted)]"
              : "border-[var(--color-gold)] text-[var(--color-gold)]"
          }`}
        >
          {getStatusLabel(order.status)}
        </span>
      </header>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-[var(--color-cream)] mb-4">
            {t.account.orders.items}
          </h2>
          {order.items.map((item) => (
            <div
              key={`${item.productId}:${item.variationId ?? "default"}`}
              className="flex gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              {item.thumbnailUrl ? (
                <Image
                  src={item.thumbnailUrl}
                  alt={item.productName}
                  width={80}
                  height={80}
                  className="w-20 h-20 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-[var(--color-border)] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <LocaleLink
                  href={`/products/${item.productSlug}`}
                  className="font-display text-lg text-[var(--color-cream)] hover:text-[var(--color-gold)]"
                >
                  {item.productName}
                </LocaleLink>
                <p className="text-xs text-[var(--color-gold-muted)] mt-1">
                  {t.cart.quantity}: {item.quantity}
                </p>
                {item.variationSku && (
                  <p className="text-xs text-[var(--color-gold-muted)]">
                    {t.common.sku}: {item.variationSku}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[var(--color-cream)] font-display">
                  {formatNpr(item.priceAtOrder * item.quantity)}
                </p>
                <p className="text-xs text-[var(--color-gold-muted)]">
                  {formatNpr(item.priceAtOrder)} ea
                </p>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-6">
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="label-eyebrow mb-4">
              {t.account.orders.statusTimeline}
            </h3>
            <ol className="space-y-0">
              {order.statusEvents.map((event, i) => {
                const last = i === order.statusEvents.length - 1;
                return (
                  <li key={`${event.status}:${event.createdAt}`} className="relative pl-6 pb-5 last:pb-0">
                    {!last && (
                      <span className="absolute left-[5px] top-3 bottom-0 w-px bg-[var(--color-border)]" />
                    )}
                    <span
                      className={`absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border ${
                        last
                          ? "border-[var(--color-gold)] bg-[var(--color-gold)]"
                          : "border-[var(--color-gold-muted)] bg-[var(--color-surface)]"
                      }`}
                    />
                    <p
                      className={`text-sm ${
                        last
                          ? "text-[var(--color-gold)]"
                          : "text-[var(--color-cream)]"
                      }`}
                    >
                      {getStatusLabel(event.status)}
                    </p>
                    <p className="text-xs text-[var(--color-gold-muted)]">
                      {formatDate(event.createdAt)}
                    </p>
                    {event.notes && (
                      <p className="text-xs text-[var(--color-gold-muted)] mt-1">
                        {event.notes}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
            <h3 className="label-eyebrow">{t.account.orders.orderSummary}</h3>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-gold-muted)]">{t.account.orders.subtotal}</span>
              <span className="text-[var(--color-cream)]">
                {formatNpr(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-[var(--color-border)]">
              <span className="font-display text-lg text-[var(--color-cream)]">
                {t.account.orders.total}
              </span>
              <span className="font-display text-lg text-[var(--color-gold)]">
                {formatNpr(order.total)}
              </span>
            </div>
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
            <h3 className="label-eyebrow">{t.account.orders.deliveryDetails}</h3>
            <p className="text-sm text-[var(--color-cream)]">
              {order.delivery.name}
            </p>
            <p className="text-sm text-[var(--color-gold-muted)]">
              {order.delivery.phone}
            </p>
            <p className="text-sm text-[var(--color-gold-muted)] break-words">
              {order.delivery.address}
            </p>
            <p className="text-xs text-[var(--color-gold-muted)] uppercase tracking-[0.15em] mt-2">
              {getZoneLabel(order.delivery.zone)}
            </p>
            {order.delivery.notes && (
              <p className="text-xs text-[var(--color-gold-muted)] mt-2">
                {order.delivery.notes}
              </p>
            )}
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
            <h3 className="label-eyebrow">{t.account.orders.paymentDetails}</h3>
            <p className="text-sm text-[var(--color-cream)]">
              {PAYMENT_LABEL[order.payment.method]}
            </p>
            <p className="text-xs text-[var(--color-gold-muted)]">
              {order.payment.status === "completed"
                ? t.account.orders.paymentCompleted
                : t.account.orders.paymentPending}
            </p>
          </div>

          <Button href={enquireUrl} external variant="primary" className="w-full">
            {t.account.orders.askAboutOrder}
          </Button>
        </aside>
      </div>
    </section>
  );
}

export default function OrderDetailPage(props: { params: Promise<{ number: string }> }) {
  const params = use(props.params);
  return (
    <OrderDetailInner orderNumber={params.number} />
  );
}
