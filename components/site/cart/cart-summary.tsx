"use client";

import { Button } from "@/components/site/shared/button";
import { useCart } from "@/context/cart-context";
import { formatNpr } from "@/lib/format";

const MEMBER_THRESHOLD = 1500;
const MEMBER_DISCOUNT_PCT = 0.05;

interface Props {
  showCheckoutCta?: boolean;
}

export function CartSummary({ showCheckoutCta = true }: Props) {
  const { subtotal, count } = useCart();
  const isMember = subtotal >= MEMBER_THRESHOLD;
  const discount = isMember ? subtotal * MEMBER_DISCOUNT_PCT : 0;
  const total = subtotal - discount;
  return (
    <aside className="border border-[var(--color-border)] bg-[var(--color-surface)] p-6 md:sticky md:top-24">
      <h2 className="font-display text-2xl text-[var(--color-cream)] mb-6">
        Order summary
      </h2>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-[var(--color-gold-muted)]">
            Subtotal · {count} items
          </dt>
          <dd className="text-[var(--color-cream)]">{formatNpr(subtotal)}</dd>
        </div>
        {isMember && (
          <div className="flex justify-between text-[var(--color-gold)]">
            <dt>Member discount (5%)</dt>
            <dd>−{formatNpr(discount)}</dd>
          </div>
        )}
        <div className="flex justify-between border-t border-[var(--color-border-soft)] pt-3 text-base">
          <dt className="text-[var(--color-cream)]">Total</dt>
          <dd className="text-[var(--color-gold)] font-display text-xl">
            {formatNpr(total)}
          </dd>
        </div>
      </dl>
      {!isMember && subtotal > 0 && (
        <p className="mt-4 text-xs text-[var(--color-gold-muted)]">
          {formatNpr(MEMBER_THRESHOLD - subtotal)} more to unlock member pricing.
        </p>
      )}
      {showCheckoutCta && count > 0 && (
        <Button
          href="/checkout"
          variant="primary"
          size="lg"
          className="w-full mt-6"
        >
          Proceed to Checkout
        </Button>
      )}
    </aside>
  );
}

export const SUMMARY_CONSTANTS = {
  MEMBER_THRESHOLD,
  MEMBER_DISCOUNT_PCT,
};
