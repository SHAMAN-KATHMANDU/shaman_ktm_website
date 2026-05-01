"use client";

import Link from "next/link";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { Button } from "@/components/site/shared/button";
import { CartItemRow } from "@/components/site/cart/cart-item-row";
import { CartSummary } from "@/components/site/cart/cart-summary";
import { useCart } from "@/context/cart-context";

function CartContent() {
  const cart = useCart();
  if (cart.items.length === 0) {
    return (
      <section className="px-6 md:px-10 mx-auto max-w-[1100px] py-20 text-center">
        <p className="label-eyebrow mb-3">Empty cart</p>
        <h1 className="font-display text-4xl text-[var(--color-cream)] mb-6">
          Nothing in here yet
        </h1>
        <p className="text-[var(--color-gold-muted)] mb-10">
          Browse the elements and add a few things to your cart.
        </p>
        <Button href="/nature" variant="primary" size="lg">
          Browse Nature
        </Button>
      </section>
    );
  }
  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1400px] py-10 grid grid-cols-1 md:grid-cols-[1fr_360px] gap-10">
      <div>
        <h1 className="font-display text-4xl text-[var(--color-cream)] mb-2">
          Cart
        </h1>
        <p className="label-eyebrow mb-8">{cart.count} items</p>
        <div>
          {cart.items.map((item) => (
            <CartItemRow
              key={`${item.productId}-${item.variationId ?? ""}`}
              item={item}
            />
          ))}
        </div>
        <Link
          href="/nature"
          className="inline-block mt-8 label-nav text-[10px] text-[var(--color-gold-muted)] hover:text-[var(--color-gold)]"
        >
          ← Continue shopping
        </Link>
      </div>
      <CartSummary />
    </section>
  );
}

export default function CartPage() {
  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-6 mx-auto max-w-[1400px]">
          <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Cart" }]} />
        </section>
        <CartContent />
      </SiteShell>
    </SiteProviders>
  );
}
