"use client";

import { LocaleLink } from "@/components/site/locale-link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { BundleSummary } from "@/lib/api/types";
import { splitLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export function BundleCard({ bundle }: { bundle: BundleSummary }) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const thumb = bundle.items[0]?.thumbnailUrl;
  return (
    <LocaleLink
      href={`/bundles/${bundle.slug}`}
      className="group block bg-[var(--color-surface)] border border-[var(--color-border-soft)] hover:border-[var(--color-gold)] transition-all hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface-2)]">
        {thumb && (
          <Image
            src={thumb}
            alt={bundle.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 450px"
            loading="lazy"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute top-3 left-3">
          <span className="label-nav text-[10px] px-2.5 py-1 border border-[var(--color-gold)] text-[var(--color-gold)] bg-black/50">
            {t.pages.bundle} · {bundle.items.length} {t.pages.pieces}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display text-2xl text-[var(--color-cream)] leading-tight mb-3">
          {bundle.title}
        </h3>
        <span className="text-[var(--color-gold)]">
          {t.product.enquireOnWhatsapp}
        </span>
      </div>
    </LocaleLink>
  );
}
