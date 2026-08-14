"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/site/shared/button";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { formatNpr } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { splitLocale, localizeHref } from "@/lib/i18n/locale";
import { trackInitiateCheckout, trackPurchase } from "@/lib/pixel";
import { catalogItemId } from "@/lib/catalog-id";
import type { DeliveryZone } from "@/lib/api/types";

const DELIVERY_ZONES: DeliveryZone[] = ["thamel", "jhamsikhel", "gongabu", "shipping"];

function CheckoutPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const toast = useToast();

  const { items, subtotal, clear } = useCart();
  const { user, hydrated } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState<DeliveryZone>("thamel");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Populate form with user data if available
  useEffect(() => {
    if (user) {
      setFullName(user.name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  // Redirect if not logged in
  useEffect(() => {
    if (hydrated && !user) {
      router.replace(localizeHref("/account/login?next=/checkout", locale));
    }
  }, [hydrated, user, router, locale]);

  // Redirect if no items in cart
  useEffect(() => {
    if (hydrated && items.length === 0) {
      router.replace(localizeHref("/cart", locale));
    }
  }, [hydrated, items, router, locale]);

  // Meta Pixel InitiateCheckout — once, when the customer reaches checkout
  // with a non-empty cart.
  const checkoutTracked = useRef(false);
  useEffect(() => {
    if (checkoutTracked.current || !hydrated || items.length === 0) return;
    checkoutTracked.current = true;
    trackInitiateCheckout(
      items.map((i) => ({
        contentId: catalogItemId(i.productSlug, i.variationId),
        quantity: i.quantity,
        itemPrice: i.priceAtAdd,
      })),
      subtotal,
    );
  }, [hydrated, items, subtotal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !phone.trim() || !address.trim()) {
      toast.show(t.checkout.requiredFields, { variant: "error" });
      return;
    }

    // Basic phone validation (at least 10 digits)
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      toast.show(t.checkout.invalidPhone, { variant: "error" });
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map((item) => ({
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity,
      }));

      const res = await fetch("/api/customer/orders", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          delivery: {
            name: fullName.trim(),
            phone: phone.trim(),
            address: address.trim(),
            zone,
            notes: notes.trim() || null,
          },
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const order = data.order;
        const orderNumber = order?.number;
        // Meta Pixel Purchase — fired here (not on the order page) so it can't
        // refire on refresh; value/ids come from the authoritative response.
        if (order?.number) {
          trackPurchase({
            orderNumber: order.number,
            items: (order.items ?? []).map(
              (it: {
                productSlug: string;
                variationId: string | null;
                quantity: number;
                priceAtOrder: number;
              }) => ({
                contentId: catalogItemId(it.productSlug, it.variationId),
                quantity: it.quantity,
                itemPrice: it.priceAtOrder,
              }),
            ),
            value: order.total,
          });
        }
        clear();
        toast.show(t.checkout.orderPlaced, { variant: "success" });
        router.push(localizeHref(`/account/orders/${orderNumber}?placed=1`, locale));
      } else {
        toast.show(data.message || t.checkout.failed, { variant: "error" });
      }
    } catch {
      toast.show(t.common.networkError, { variant: "error" });
    }
    setLoading(false);
  };

  const getZoneLabel = (z: DeliveryZone) => {
    const zoneMap: Record<DeliveryZone, string> = {
      thamel: t.account.deliveryZones.thamel,
      jhamsikhel: t.account.deliveryZones.jhamsikhel,
      gongabu: t.account.deliveryZones.gongabu,
      shipping: t.account.deliveryZones.shipping,
    };
    return zoneMap[z] || z;
  };

  if (!hydrated || !user || items.length === 0) {
    return (
      <section className="px-6 py-20 text-center text-ink-soft">
        {t.common.loading}
      </section>
    );
  }

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1100px] py-12">
      <h1 className="font-display text-4xl text-ink mb-10">
        {t.checkout.title}
      </h1>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-8">
          {/* Order Summary */}
          <div>
            <h2 className="font-display text-2xl text-ink mb-4">
              {t.checkout.orderSummary}
            </h2>
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.productId}:${item.variationId ?? "default"}`}
                  className="flex gap-4 border border-line bg-surface p-4"
                >
                  {item.thumbnailAtAdd ? (
                    <Image
                      src={item.thumbnailAtAdd}
                      alt={item.nameAtAdd}
                      width={60}
                      height={60}
                      className="w-16 h-16 object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-surface flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-display text-ink">
                      {item.nameAtAdd}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {t.cart.quantity}: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-metal-text font-display tabular-nums">
                      {formatNpr(item.priceAtAdd * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Info */}
          <div>
            <h2 className="font-display text-2xl text-ink mb-4">
              {t.checkout.deliveryInfo}
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="full-name" className="label-eyebrow block mb-2">
                  {t.checkout.fullName}
                </label>
                <input
                  id="full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  className="w-full bg-surface border border-line focus:border-metal-deep outline-none px-4 py-3 text-ink disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="phone" className="label-eyebrow block mb-2">
                  {t.checkout.phone}
                </label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="w-full bg-surface border border-line focus:border-metal-deep outline-none px-4 py-3 text-ink disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="address" className="label-eyebrow block mb-2">
                  {t.checkout.address}
                </label>
                <textarea
                  id="address"
                  required
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={loading}
                  className="w-full bg-surface border border-line focus:border-metal-deep outline-none px-4 py-3 text-ink disabled:opacity-50 resize-none"
                />
              </div>
              <div>
                <label htmlFor="zone" className="label-eyebrow block mb-2">
                  {t.checkout.zone}
                </label>
                <select
                  id="zone"
                  value={zone}
                  onChange={(e) => setZone(e.target.value as DeliveryZone)}
                  disabled={loading}
                  className="w-full bg-surface border border-line focus:border-metal-deep outline-none px-4 py-3 text-ink disabled:opacity-50"
                >
                  {DELIVERY_ZONES.map((z) => (
                    <option key={z} value={z}>
                      {getZoneLabel(z)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="notes" className="label-eyebrow block mb-2">
                  {t.checkout.notes}
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={loading}
                  className="w-full bg-surface border border-line focus:border-metal-deep outline-none px-4 py-3 text-ink disabled:opacity-50 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <h2 className="font-display text-2xl text-ink mb-4">
              {t.checkout.paymentMethod}
            </h2>
            <div className="border border-line bg-surface p-4 rounded-card">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  value="cod"
                  defaultChecked
                  className="w-4 h-4"
                  disabled={loading}
                />
                <span className="text-ink">{t.checkout.cod}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Order Total Sidebar */}
        <aside>
          <div className="border border-line bg-surface p-5 space-y-4 sticky top-24 rounded-card">
            <h3 className="label-eyebrow">{t.checkout.summary}</h3>
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">{t.checkout.subtotal}</span>
              <span className="text-ink tabular-nums">
                {formatNpr(subtotal)}
              </span>
            </div>
            <div className="pt-4 border-t border-line">
              <div className="flex justify-between mb-4">
                <span className="font-display text-lg text-ink">
                  {t.checkout.total}
                </span>
                <span className="font-display text-lg text-metal-text tabular-nums">
                  {formatNpr(subtotal)}
                </span>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? t.common.loading : t.checkout.placeOrder}
              </Button>
            </div>
          </div>
        </aside>
      </form>
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <CheckoutPageInner />
  );
}
