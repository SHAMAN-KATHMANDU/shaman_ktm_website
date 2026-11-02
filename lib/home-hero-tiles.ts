// Pure resolution of hero art-wall tiles (HomepageConfig.heroTiles) into
// renderable cards. Kept free of prisma so the precedence rules are unit
// tested without a DB — the server resolver in lib/api/server/homepage.ts
// loads the rows and delegates here.

import type { Locale } from "@/lib/i18n/locale";

export interface HeroTileConfig {
  productId?: string | null;
  collectionSlug?: string | null;
  imageUrl?: string | null;
  label?: string | null;
  labelNe?: string | null;
}

export interface HeroTileProduct {
  id: string;
  slug: string;
  name: string;
  nameNe?: string | null;
  thumbnailUrl?: string | null;
  /** First gallery image, used when the product has no thumbnail. */
  firstImageUrl?: string | null;
}

export interface HeroTileCollection {
  slug: string;
  title: string;
  titleNe?: string | null;
  heroImageUrl?: string | null;
}

export interface ResolvedHeroTile {
  href: string;
  imageUrl: string;
  label: string;
}

function localized(en: string, ne: string | null | undefined, locale: Locale): string {
  return locale === "ne" && ne && ne.trim() !== "" ? ne : en;
}

function clean(v: string | null | undefined): string {
  return v?.trim() ?? "";
}

/**
 * Image: override → collection hero → product thumbnail / first image.
 * Link: product page, else collection page. Caption: label override, else the
 * product name, else the collection title. Returns null when the tile has no
 * usable image or link (unpublished product, deleted collection, etc.).
 */
export function resolveHeroTile(
  tile: HeroTileConfig,
  product: HeroTileProduct | undefined,
  collection: HeroTileCollection | undefined,
  locale: Locale = "en",
): ResolvedHeroTile | null {
  const imageUrl =
    clean(tile.imageUrl) ||
    clean(collection?.heroImageUrl) ||
    clean(product?.thumbnailUrl) ||
    clean(product?.firstImageUrl);

  const href = product
    ? `/products/${product.slug}`
    : collection
      ? `/collections/${collection.slug}`
      : "";

  if (!imageUrl || !href) return null;

  const override = localized(clean(tile.label), clean(tile.labelNe), locale);
  const label =
    override ||
    (product
      ? localized(product.name, product.nameNe, locale)
      : collection
        ? localized(collection.title, collection.titleNe, locale)
        : "");

  return { href, imageUrl, label };
}
