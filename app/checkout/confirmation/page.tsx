"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import { readJson } from "@/lib/storage";
import { formatNpr } from "@/lib/format";
import { buildEnquireUrl } from "@/lib/whatsapp";
import type { Order } from "@/lib/api/types";

function ConfirmationInner() {
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    const lastNumber = readJson<string>("sk:orders:last");
    if (!lastNumber) return;
    const stored = readJson<Order>(`sk:orders:${lastNumber}`);
    if (stored) setOrder(stored);
  }, []);

  if (!order) {
    return (
      <section className="px-6 md:px-10 mx-auto max-w-[800px] py-20 text-center">
        <p className="label-eyebrow mb-3">No order found</p>
        <h1 className="font-display text-3xl text-[var(--color-cream)] mb-6">
          Nothing to confirm
        </h1>
        <Button href="/" variant="primary">
          Back home
        </Button>
      </section>
    );
  }

  const waUrl = buildEnquireUrl({
    message: `Hi! I just placed order ${order.number}. Following up here.`,
  });

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[800px] py-12">
      <div className="text-center mb-12">
        <p className="label-eyebrow text-[var(--color-success)] mb-3">
          Order confirmed
        </p>
        <h1 className="display-heading font-display text-4xl md:text-5xl text-[var(--color-cream)] leading-tight mb-4">
          Thank you, <em>{order.delivery.name}</em>
        </h1>
        <p className="text-[var(--color-gold-muted)]">
          Order <span className="text-[var(--color-gold)]">{order.number}</span>{" "}
          is in. We'll confirm details by phone or WhatsApp shortly.
        </p>
      </div>

      <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 mb-6">
        <h2 className="label-eyebrow mb-4">Items</h2>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li
              key={`${item.productId}-${item.variationId ?? ""}`}
              className="flex justify-between"
            >
              <span className="text-[var(--color-cream)]">
                {item.nameAtAdd} × {item.quantity}
              </span>
              <span className="text-[var(--color-gold)]">
                {formatNpr(item.priceAtAdd * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <div className="border-t border-[var(--color-border-soft)] mt-4 pt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-gold-muted)]">Subtotal</span>
            <span className="text-[var(--color-cream)]">
              {formatNpr(order.subtotal)}
            </span>
          </div>
          {order.memberDiscount > 0 && (
            <div className="flex justify-between text-[var(--color-gold)]">
              <span>Member discount</span>
              <span>−{formatNpr(order.memberDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base pt-2 border-t border-[var(--color-border-soft)]">
            <span className="text-[var(--color-cream)]">Total</span>
            <span className="text-[var(--color-gold)] font-display text-xl">
              {formatNpr(order.total)}
            </span>
          </div>
        </div>
      </div>

      <div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 mb-6">
        <h2 className="label-eyebrow mb-4">Delivery</h2>
        <p className="text-[var(--color-cream)]">{order.delivery.name}</p>
        <p className="text-sm text-[var(--color-gold-muted)]">
          {order.delivery.phone}
        </p>
        {order.delivery.address && (
          <p className="text-sm text-[var(--color-gold-muted)] mt-2">
            {order.delivery.address}
          </p>
        )}
        <p className="text-xs text-[var(--color-gold-muted)] mt-3 capitalize">
          {order.delivery.zone === "shipping"
            ? "Ship within valley"
            : `${order.delivery.zone} pickup`}
        </p>
      </div>

      {order.memberDiscount > 0 && (
        <div className="border border-[var(--color-gold)] bg-[var(--color-gold)]/5 p-6 mb-6">
          <p className="label-eyebrow mb-2">You're a member</p>
          <p className="text-sm text-[var(--color-cream)]">
            This purchase enrolled you in member pricing. Future orders will
            apply the discount automatically.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button href={waUrl} external variant="outline" className="flex-1">
          Confirm on WhatsApp
        </Button>
        <Button href="/nature" variant="primary" className="flex-1">
          Continue shopping
        </Button>
      </div>

      <p className="mt-10 text-center text-xs text-[var(--color-gold-muted)]">
        <Link href="/account/dashboard" className="hover:text-[var(--color-gold)]">
          View all your orders →
        </Link>
      </p>
    </section>
  );
}

export default function ConfirmationPage() {
  return (
    <SiteProviders>
      <SiteShell>
        <ConfirmationInner />
      </SiteShell>
    </SiteProviders>
  );
}
