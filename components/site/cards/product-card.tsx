"use client";

import { LocaleLink } from "@/components/site/locale-link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ProductSummary } from "@/lib/api/types";
import { Badge } from "@/components/site/shared/badge";
import { WishlistButton } from "@/components/site/product/wishlist-button";
import { splitLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { formatNpr } from "@/lib/format";

interface Props {
  product: ProductSummary;
  className?: string;
  ctaLabel?: string;
  /** Render the price block (pass the showPrices module flag). */
  showPrice?: boolean;
  /**
   * Extra % off the offer price rendered as a "Members NPR X" line.
   * 0 / undefined hides the member line.
   */
  memberDiscountPercent?: number;
  /** Copy before the computed member price (homeCopy.campaignMemberPricePrefix). */
  memberPricePrefix?: string;
  /** Campaign/clearance badge rendered over the image (e.g. "−10% Shrawan"). */
  badgeLabel?: string;
  badgeTone?: "offer" | "final" | "member" | "new";
  /** Explicit badge colour (e.g. the section accent); overrides badgeTone. */
  badgeColor?: string;
}

const ELEMENT_TAGS = new Set([
  "metal",
  "earth",
  "wood",
  "plant",
  "water",
  "air",
  "dual-element",
]);

const energyOf = (tags: string[] | undefined): string | undefined => {
  if (!tags) return undefined;
  // First tag that isn't a system tag, an element slug, or a product/element ref.
  return tags.find(
    (t) =>
      !["new", "member", "showroom-only"].includes(t) &&
      !ELEMENT_TAGS.has(t) &&
      !t.startsWith("product:") &&
      !t.startsWith("element:"),
  );
};

export function ProductCard({
  product,
  className = "",
  ctaLabel,
  showPrice = false,
  memberDiscountPercent = 0,
  memberPricePrefix,
  badgeLabel,
  badgeTone = "offer",
  badgeColor,
}: Props) {
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const elements = product.elementSlugs ?? [];
  const energy = energyOf(product.tags);
  const isNew = product.tags?.includes("new");
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice > product.price;
  const memberPrice =
    memberDiscountPercent > 0
      ? Math.floor(product.price * (1 - memberDiscountPercent / 100))
      : null;
  return (
    <LocaleLink
      href={`/products/${product.slug}`}
      data-element={elements[0]}
      className={`group block bg-surface border border-line hover:border-metal hover:shadow-lift transition-[border-color,box-shadow,transform] duration-500 ease-lux hover:-translate-y-1 ${className}`}
    >
      {/* Bone mat + hairline inner rule: the photo sits mounted in the frame. */}
      <div className="relative m-2 mb-0 aspect-[3/4] overflow-hidden bg-cream outline outline-1 -outline-offset-1 outline-line/70">
        {product.thumbnailUrl && (
          <Image
            src={product.thumbnailUrl}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 350px"
            loading="lazy"
            className="object-cover transition-transform duration-[900ms] ease-lux group-hover:scale-[1.04]"
          />
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {badgeLabel && (
            <Badge
              tone={badgeTone}
              color={badgeColor}
              className="bg-surface"
            >
              {badgeLabel}
            </Badge>
          )}
          {elements.map((el) => (
            <Badge key={el} tone="element" element={el}>
              {el}
            </Badge>
          ))}
          {isNew && <Badge tone="new">{t.common.new}</Badge>}
        </div>
        <div className="absolute top-2 right-2">
          <WishlistButton
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              thumbnailUrl: product.thumbnailUrl,
            }}
          />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg leading-tight text-ink mb-2 line-clamp-2">
          {product.name}
        </h3>
        {showPrice && (
          <div className="mb-2">
            {product.priceOnEnquiry ? (
              <p className="text-sm text-ink-soft">
                {t.product.priceOnEnquiry}
              </p>
            ) : (
              <>
                <div className="flex items-baseline gap-2 flex-wrap">
                  {onSale && (
                    <span className="text-xs text-ink-soft line-through tabular-nums">
                      {formatNpr(product.compareAtPrice!)}
                    </span>
                  )}
                  <span className="text-sm font-medium text-metal-text tabular-nums">
                    {formatNpr(product.price)}
                  </span>
                </div>
                {memberPrice !== null && (
                  <p className="mt-1 label-nav text-[10px] text-ink-soft tabular-nums">
                    {memberPricePrefix ?? t.product.members} {formatNpr(memberPrice)}
                  </p>
                )}
              </>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-metal-text text-sm">
            {ctaLabel ?? t.product.enquireOnWhatsapp}
          </span>
          {energy && (
            <span className="shrink-0 label-nav text-[10px] text-ink-soft">
              {energy}
            </span>
          )}
        </div>
      </div>
    </LocaleLink>
  );
}
