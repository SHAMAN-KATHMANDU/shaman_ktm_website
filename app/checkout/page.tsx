"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Breadcrumbs } from "@/components/site/shared/breadcrumbs";
import { Button } from "@/components/site/shared/button";
import { CartSummary } from "@/components/site/cart/cart-summary";
import { CheckoutStepper } from "@/components/site/checkout/checkout-stepper";
import { useCart } from "@/context/cart-context";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { writeJson } from "@/lib/storage";
import type { DeliveryZone, Order, PaymentMethod } from "@/lib/api/types";
import { formatNpr } from "@/lib/format";

const ZONES: { value: DeliveryZone; label: string; fee: string }[] = [
  { value: "thamel", label: "Thamel pickup", fee: "Free" },
  { value: "jhamsikhel", label: "Jhamsikhel pickup", fee: "Free" },
  { value: "gongabu", label: "Gongabu pickup", fee: "Free" },
  { value: "shipping", label: "Ship within Kathmandu valley", fee: "NPR 200" },
];

const PAYMENTS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: "esewa", label: "eSewa", description: "Pay with your eSewa wallet." },
  { value: "khalti", label: "Khalti", description: "Pay with Khalti." },
  { value: "cod", label: "Cash on Delivery", description: "Pay when the parcel arrives." },
  { value: "bank", label: "Bank Transfer", description: "We'll send transfer details on confirmation." },
];

function CheckoutInner() {
  const router = useRouter();
  const cart = useCart();
  const auth = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [delivery, setDelivery] = useState({
    name: auth.user?.name ?? "",
    phone: auth.user?.phone ?? "",
    address: "",
    notes: "",
    zone: "thamel" as DeliveryZone,
  });
  const [payment, setPayment] = useState<PaymentMethod>("esewa");
  const [submitting, setSubmitting] = useState(false);

  if (cart.items.length === 0) {
    return (
      <section className="px-6 md:px-10 py-20 text-center max-w-2xl mx-auto">
        <p className="label-eyebrow mb-3">Empty cart</p>
        <h1 className="font-display text-3xl text-[var(--color-cream)] mb-6">
          Nothing to check out
        </h1>
        <Button href="/nature" variant="primary" size="lg">
          Browse Nature
        </Button>
      </section>
    );
  }

  const subtotal = cart.subtotal;
  const memberDiscount = subtotal >= 1500 ? subtotal * 0.05 : 0;
  const total = subtotal - memberDiscount;

  const placeOrder = () => {
    if (!delivery.name.trim() || !delivery.phone.trim()) {
      toast.show("Please fill in delivery details first", { variant: "error" });
      setStep(2);
      return;
    }
    setSubmitting(true);
    const number = `SK-${Date.now().toString(36).toUpperCase()}`;
    const order: Order = {
      number,
      items: cart.items,
      subtotal,
      memberDiscount,
      total,
      delivery: {
        name: delivery.name.trim(),
        phone: delivery.phone.trim(),
        address: delivery.address.trim(),
        zone: delivery.zone,
        notes: delivery.notes.trim() || undefined,
      },
      payment: { method: payment, status: "pending" },
      createdAt: new Date().toISOString(),
    };
    writeJson(`sk:orders:${number}`, order);
    writeJson(`sk:orders:last`, number);
    cart.clear();
    if (total >= 1500) auth.setMember("member");
    toast.show(`Order ${number} placed`, { variant: "success" });
    setSubmitting(false);
    router.push("/checkout/confirmation");
  };

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1100px] py-10">
      <CheckoutStepper current={step} />
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-10">
        <div>
          {step === 1 && (
            <div>
              <h2 className="font-display text-3xl text-[var(--color-cream)] mb-6">
                Review your cart
              </h2>
              <div>
                {cart.items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variationId ?? ""}`}
                    className="flex justify-between items-center py-3 border-b border-[var(--color-border-soft)]"
                  >
                    <span className="text-[var(--color-cream)]">
                      {item.nameAtAdd} × {item.quantity}
                    </span>
                    <span className="text-[var(--color-gold)]">
                      {formatNpr(item.priceAtAdd * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8 flex justify-end">
                <Button onClick={() => setStep(2)} variant="primary" size="lg">
                  Continue to Delivery
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-display text-3xl text-[var(--color-cream)] mb-6">
                Delivery details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Full name"
                  value={delivery.name}
                  onChange={(v) => setDelivery((d) => ({ ...d, name: v }))}
                />
                <Field
                  label="Phone"
                  value={delivery.phone}
                  onChange={(v) => setDelivery((d) => ({ ...d, phone: v }))}
                />
                <Field
                  label="Address"
                  value={delivery.address}
                  onChange={(v) => setDelivery((d) => ({ ...d, address: v }))}
                  className="md:col-span-2"
                />
                <Field
                  label="Notes (optional)"
                  value={delivery.notes}
                  onChange={(v) => setDelivery((d) => ({ ...d, notes: v }))}
                  textarea
                  className="md:col-span-2"
                />
              </div>
              <h3 className="label-eyebrow mt-8 mb-4">Pickup or shipping</h3>
              <div className="space-y-2">
                {ZONES.map((z) => (
                  <label
                    key={z.value}
                    className={`flex items-center justify-between p-4 border cursor-pointer transition-colors ${
                      delivery.zone === z.value
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)]/5"
                        : "border-[var(--color-border)] hover:border-[var(--color-gold)]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`w-4 h-4 rounded-full border ${
                          delivery.zone === z.value
                            ? "border-[var(--color-gold)] bg-[var(--color-gold)]"
                            : "border-[var(--color-border)]"
                        }`}
                      />
                      <span className="text-[var(--color-cream)]">{z.label}</span>
                    </span>
                    <span className="text-[var(--color-gold-muted)] text-sm">
                      {z.fee}
                    </span>
                    <input
                      type="radio"
                      className="sr-only"
                      checked={delivery.zone === z.value}
                      onChange={() =>
                        setDelivery((d) => ({ ...d, zone: z.value }))
                      }
                      name="zone"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-8 flex justify-between">
                <Button onClick={() => setStep(1)} variant="ghost">
                  Back
                </Button>
                <Button onClick={() => setStep(3)} variant="primary" size="lg">
                  Continue to Payment
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-display text-3xl text-[var(--color-cream)] mb-6">
                Payment method
              </h2>
              <div className="space-y-2">
                {PAYMENTS.map((p) => (
                  <label
                    key={p.value}
                    className={`flex items-start gap-3 p-4 border cursor-pointer transition-colors ${
                      payment === p.value
                        ? "border-[var(--color-gold)] bg-[var(--color-gold)]/5"
                        : "border-[var(--color-border)] hover:border-[var(--color-gold)]"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border mt-1 flex-shrink-0 ${
                        payment === p.value
                          ? "border-[var(--color-gold)] bg-[var(--color-gold)]"
                          : "border-[var(--color-border)]"
                      }`}
                    />
                    <span>
                      <span className="block text-[var(--color-cream)] font-display text-lg">
                        {p.label}
                      </span>
                      <span className="block text-xs text-[var(--color-gold-muted)] mt-1">
                        {p.description}
                      </span>
                    </span>
                    <input
                      type="radio"
                      className="sr-only"
                      checked={payment === p.value}
                      onChange={() => setPayment(p.value)}
                      name="payment"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-8 flex justify-between">
                <Button onClick={() => setStep(2)} variant="ghost">
                  Back
                </Button>
                <Button
                  onClick={placeOrder}
                  variant="primary"
                  size="lg"
                  disabled={submitting}
                >
                  {submitting ? "Placing order…" : "Place order"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <CartSummary showCheckoutCta={false} />
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label-eyebrow block mb-2">{label}</span>
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-gold)] outline-none px-4 py-3 text-[var(--color-cream)] resize-y"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] focus:border-[var(--color-gold)] outline-none px-4 py-3 text-[var(--color-cream)]"
        />
      )}
    </label>
  );
}

export default function CheckoutPage() {
  return (
    <SiteProviders>
      <SiteShell>
        <section className="px-6 md:px-10 pt-10 pb-2 mx-auto max-w-[1100px]">
          <Breadcrumbs
            items={[
              { href: "/", label: "Home" },
              { href: "/cart", label: "Cart" },
              { label: "Checkout" },
            ]}
          />
        </section>
        <CheckoutInner />
      </SiteShell>
    </SiteProviders>
  );
}
