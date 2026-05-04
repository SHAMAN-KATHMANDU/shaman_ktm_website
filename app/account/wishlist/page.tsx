"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import {
  listWishlist,
  removeFromWishlist,
  type WishlistItem,
} from "@/lib/wishlist";

function WishlistInner() {
  const [items, setItems] = useState<WishlistItem[]>([]);

  const reload = () => setItems(listWishlist());
  useEffect(() => {
    reload();
  }, []);

  const remove = (productId: string) => {
    removeFromWishlist(productId);
    reload();
  };

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[1100px] py-12">
      <header className="mb-12">
        <p className="label-eyebrow mb-2">Account</p>
        <h1 className="font-display text-4xl text-[var(--color-cream)]">
          Wishlist
        </h1>
        <p className="text-sm text-[var(--color-gold-muted)] mt-1">
          Saved on this device. WhatsApp us when you&rsquo;re ready to enquire.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="border border-[var(--color-border)] p-10 text-center">
          <p className="text-[var(--color-gold-muted)] mb-6">
            Nothing saved yet. Tap the heart on any product to add it.
          </p>
          <Button href="/nature" variant="primary">
            Browse Nature
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div
              key={item.productId}
              className="border border-[var(--color-border-soft)] bg-[var(--color-surface)] overflow-hidden"
            >
              <Link
                href={`/products/${item.slug}`}
                className="block relative aspect-[3/4] bg-[var(--color-surface-2)]"
              >
                {item.thumbnailUrl && (
                  <Image
                    src={item.thumbnailUrl}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover"
                  />
                )}
              </Link>
              <div className="p-4 flex items-center justify-between gap-3">
                <Link
                  href={`/products/${item.slug}`}
                  className="font-display text-base text-[var(--color-cream)] hover:text-[var(--color-gold)] line-clamp-2"
                >
                  {item.name}
                </Link>
                <button
                  type="button"
                  onClick={() => remove(item.productId)}
                  aria-label={`Remove ${item.name} from wishlist`}
                  className="p-2 text-[var(--color-gold-muted)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function WishlistPage() {
  return (
    <SiteProviders>
      <SiteShell>
        <WishlistInner />
      </SiteShell>
    </SiteProviders>
  );
}
