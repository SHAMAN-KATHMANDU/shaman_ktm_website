"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import { Badge } from "@/components/site/shared/badge";
import { useAuth } from "@/context/auth-context";
import { readJson } from "@/lib/storage";
import { formatDate, formatNpr } from "@/lib/format";
import { buildEnquireUrl } from "@/lib/whatsapp";
import type { Order, DeliveryZone, PaymentMethod } from "@/lib/api/types";

const ZONE_LABEL: Record<DeliveryZone, string> = {
  thamel: "Thamel",
  jhamsikhel: "Jhamsikhel",
  gongabu: "Gongabu",
  shipping: "Shipping (outside Kathmandu)",
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  esewa: "eSewa",
  khalti: "Khalti",
  cod: "Cash on delivery",
  bank: "Bank transfer",
};

function OrderDetailInner() {
  const params = useParams<{ number: string }>();
  const router = useRouter();
  const { user, hydrated } = useAuth();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    if (!params?.number) return;
    setOrder(readJson<Order>(`sk:orders:${params.number}`));
  }, [params?.number]);

  useEffect(() => {
    if (hydrated && !user) router.replace("/account/login");
  }, [hydrated, user, router]);

  if (!hydrated || order === undefined) {
    return (
      <section className="px-6 py-20 text-center text-[var(--color-gold-muted)]">
        Loading…
      </section>
    );
  }
  if (!user) return null;

  if (order === null) {
    return (
      <section className="px-6 md:px-10 mx-auto max-w-[700px] py-20 text-center">
        <h1 className="font-display text-3xl text-[var(--color-cream)] mb-4">
          Order not found
        </h1>
        <p className="text-[var(--color-gold-muted)] mb-8">
          We couldn&rsquo;t find an order with number{" "}
          <span className="font-display text-[var(--color-gold)]">
            {params?.number}
          </span>{" "}
          on this device. Orders placed on a different browser or after
          clearing storage will not appear here.
        </p>
        <Button href="/account/dashboard" variant="primary">
          Back to dashboard
        </Button>
      </section>
    );
  }

  const enquireUrl = buildEnquireUrl({
    message: `Hi, I'd like an update on order ${order.number}.`,
  });

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[900px] py-12">
      <Link
        href="/account/dashboard"
        className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
      >
        ← Back to dashboard
      </Link>

      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-6 mb-10">
        <div>
          <p className="label-eyebrow mb-2">Order</p>
          <h1 className="font-display text-4xl text-[var(--color-cream)]">
            {order.number}
          </h1>
          <p className="text-sm text-[var(--color-gold-muted)] mt-1">
            Placed {formatDate(order.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={order.payment.status === "pending" ? "default" : "member"}>
            {order.payment.status}
          </Badge>
        </div>
      </header>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-4">
          <h2 className="font-display text-2xl text-[var(--color-cream)] mb-4">
            Items
          </h2>
          {order.items.map((item) => (
            <div
              key={`${item.productId}:${item.variationId ?? "default"}`}
              className="flex gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              {item.thumbnailAtAdd ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.thumbnailAtAdd}
                  alt={item.nameAtAdd}
                  className="w-20 h-20 object-cover flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="w-20 h-20 bg-[var(--color-border)] flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.productSlug}`}
                  className="font-display text-lg text-[var(--color-cream)] hover:text-[var(--color-gold)]"
                >
                  {item.nameAtAdd}
                </Link>
                <p className="text-xs text-[var(--color-gold-muted)] mt-1">
                  Quantity: {item.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[var(--color-cream)] font-display">
                  {formatNpr(item.priceAtAdd * item.quantity)}
                </p>
                <p className="text-xs text-[var(--color-gold-muted)]">
                  {formatNpr(item.priceAtAdd)} ea
                </p>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-6">
          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
            <h3 className="label-eyebrow">Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-gold-muted)]">Subtotal</span>
              <span className="text-[var(--color-cream)]">
                {formatNpr(order.subtotal)}
              </span>
            </div>
            {order.memberDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[var(--color-gold-muted)]">
                  Member discount
                </span>
                <span className="text-[var(--color-cream)]">
                  −{formatNpr(order.memberDiscount)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-3 border-t border-[var(--color-border)]">
              <span className="font-display text-lg text-[var(--color-cream)]">
                Total
              </span>
              <span className="font-display text-lg text-[var(--color-gold)]">
                {formatNpr(order.total)}
              </span>
            </div>
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
            <h3 className="label-eyebrow">Delivery</h3>
            <p className="text-sm text-[var(--color-cream)]">
              {order.delivery.name}
            </p>
            <p className="text-sm text-[var(--color-gold-muted)]">
              {order.delivery.phone}
            </p>
            <p className="text-sm text-[var(--color-gold-muted)]">
              {order.delivery.address}
            </p>
            <p className="text-xs text-[var(--color-gold-muted)] uppercase tracking-[0.15em] mt-2">
              {ZONE_LABEL[order.delivery.zone]}
            </p>
            {order.delivery.notes && (
              <p className="text-xs text-[var(--color-gold-muted)] mt-2">
                Notes: {order.delivery.notes}
              </p>
            )}
          </div>

          <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-2">
            <h3 className="label-eyebrow">Payment</h3>
            <p className="text-sm text-[var(--color-cream)]">
              {PAYMENT_LABEL[order.payment.method]}
            </p>
            <p className="text-xs text-[var(--color-gold-muted)] capitalize">
              Status: {order.payment.status}
            </p>
          </div>

          <Button href={enquireUrl} external variant="primary" className="w-full">
            Ask about this order on WhatsApp
          </Button>
        </aside>
      </div>
    </section>
  );
}

export default function OrderDetailPage() {
  return (
    <SiteProviders>
      <SiteShell>
        <OrderDetailInner />
      </SiteShell>
    </SiteProviders>
  );
}
