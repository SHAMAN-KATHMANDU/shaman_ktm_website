"use client";

import Link from "next/link";
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
    <Link
      href={`/bundles/${bundle.slug}`}
      className="group block bg-surface border border-line hover:border-metal rounded-card transition-all hover:-translate-y-1"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-cream">
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
          <span className="label-nav text-[10px] px-2.5 py-1 border border-metal text-bone bg-ink/80">
            {t.pages.bundle} · {bundle.items.length} {t.pages.pieces}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-display text-2xl text-ink leading-tight mb-3">
          {bundle.title}
        </h3>
        <span className="text-metal-text">
          {t.product.enquireOnWhatsapp}
        </span>
      </div>
    </Link>
  );
}
