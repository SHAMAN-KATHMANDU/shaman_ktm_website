"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/site/shared/button";
import { useCart } from "@/context/cart-context";
import { formatNpr } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { splitLocale } from "@/lib/i18n/locale";
import { LocaleLink } from "@/components/site/locale-link";

function CartPageInner() {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const { items, subtotal, remove, setQuantity } = useCart();

  if (items.length === 0) {
    return (
      <section className="px-6 md:px-10 mx-auto max-w-[1100px] py-20">
        <h1 className="font-display text-4xl text-ink mb-4">
          {t.cart.title}
        </h1>
        <p className="text-ink-soft mb-8">
          {t.cart.emptyMessage}
        </p>
        <LocaleLink href="/products">
          <Button variant="primary">
            {t.cart.continueShopping}
          </Button>
        </LocaleLink>
      </section>
    );
  }

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1100px] py-12">
      <h1 className="font-display text-4xl text-ink mb-10">
        {t.cart.title}
      </h1>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
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
                  width={80}
                  height={80}
                  className="w-20 h-20 object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-surface flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <LocaleLink
                  href={`/products/${item.productSlug}`}
                  className="font-display text-lg text-ink hover:text-metal-text"
                >
                  {item.nameAtAdd}
                </LocaleLink>
                {item.variationId && (
                  <p className="text-xs text-ink-soft mt-1">
                    {t.cart.variation}: {item.variationSku ?? item.variationId}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() =>
                      item.quantity > 1 &&
                      setQuantity(item.productId, item.variationId, item.quantity - 1)
                    }
                    className="px-2 py-1 border border-line text-ink hover:text-metal-text"
                  >
                    −
                  </button>
                  <span className="px-3 text-ink">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity(item.productId, item.variationId, item.quantity + 1)
                    }
                    className="px-2 py-1 border border-line text-ink hover:text-metal-text"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-metal-text font-display tabular-nums">
                  {formatNpr(item.priceAtAdd * item.quantity)}
                </p>
                <p className="text-xs text-ink-soft mb-3 tabular-nums">
                  {formatNpr(item.priceAtAdd)} {t.cart.perUnit}
                </p>
                <button
                  onClick={() => remove(item.productId, item.variationId)}
                  className="text-xs text-ink-soft hover:text-ink uppercase tracking-[0.1em]"
                >
                  {t.cart.remove}
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-6">
          <div className="border border-line bg-surface p-5 space-y-4 rounded-card">
            <h3 className="label-eyebrow">{t.cart.summary}</h3>
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">{t.cart.subtotal}</span>
              <span className="text-ink tabular-nums">
                {formatNpr(subtotal)}
              </span>
            </div>
            <div className="pt-4 border-t border-line">
              <LocaleLink href="/checkout" className="block">
                <Button variant="primary" size="lg" className="w-full">
                  {t.cart.checkout}
                </Button>
              </LocaleLink>
            </div>
          </div>

          <LocaleLink href="/products">
            <Button variant="ghost" size="lg" className="w-full">
              {t.cart.continueShopping}
            </Button>
          </LocaleLink>
        </aside>
      </div>
    </section>
  );
}

export default function CartPage() {
  return (
    <CartPageInner />
  );
}
