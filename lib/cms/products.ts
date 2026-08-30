// Shared product write logic, called by BOTH the REST routes
// (/api/sysuser/products) and the MCP tools (lib/mcp/tools/products.ts) so the
// two surfaces can never drift. Throws CmsError on reference/uniqueness
// failures; callers translate per transport.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { initializeOnlineStock } from "@/lib/stock";
import type { z } from "zod";
import type {
  ProductSchema,
  ProductUpdateSchema,
} from "@/lib/validation/schemas";
import { CmsError } from "./errors";

export type ProductInput = z.infer<typeof ProductSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
type VariationUpdateInput = ProductUpdateInput["variations"][number];

// Tri-state update semantics for a variation that ALREADY EXISTS: a field
// absent from the payload is left untouched, an explicit null clears it, a
// value sets it.
//
// Why `in` and not `!== undefined`: Zod drops absent optional keys from its
// parsed output entirely, so the key's presence is the signal. The previous
// `label: v.label ?? null` collapsed absent and null into the same write, which
// is what made every sloppy full-replace caller silently blank the reporting
// fields — and what made an omitted `active` resurrect a retired variation.
//
// `price` and `sku` are required by the schema so they cannot be absent, and
// `stock` is deliberately never written here: it is materialized from the
// ledger by recordStockMovement().
function existingVariationData(
  v: VariationUpdateInput,
): Prisma.ProductVariationUncheckedUpdateInput {
  const data: Prisma.ProductVariationUncheckedUpdateInput = { price: v.price };
  if ("attributes" in v && v.attributes !== undefined) {
    data.attributes = v.attributes;
  }
  if ("label" in v) data.label = v.label ?? null;
  if ("color" in v) data.color = v.color ?? null;
  if ("size" in v) data.size = v.size ?? null;
  if ("dimensions" in v) {
    data.dimensions = v.dimensions
      ? (v.dimensions as Prisma.InputJsonValue)
      : Prisma.DbNull;
  }
  if ("mrp" in v) data.mrp = v.mrp ?? null;
  if ("costPrice" in v) data.costPrice = v.costPrice ?? null;
  if ("wholesalePrice" in v) data.wholesalePrice = v.wholesalePrice ?? null;
  if ("active" in v && v.active !== undefined) data.active = v.active;
  return data;
}

// A brand-new variation has no stored values to preserve, so absence simply
// means "unset" and the old flatten-everything mapping is still correct here.
function newVariationData(v: VariationUpdateInput) {
  return {
    price: v.price,
    attributes: v.attributes ?? {},
    label: v.label ?? null,
    color: v.color ?? null,
    size: v.size ?? null,
    dimensions: v.dimensions
      ? (v.dimensions as Prisma.InputJsonValue)
      : Prisma.DbNull,
    mrp: v.mrp ?? null,
    costPrice: v.costPrice ?? null,
    wholesalePrice: v.wholesalePrice ?? null,
    active: v.active ?? true,
  };
}

async function assertCategoryExists(categoryId: string): Promise<void> {
  const found = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!found) {
    const all = await prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { position: "asc" },
    });
    throw new CmsError(`Unknown categoryId "${categoryId}".`, {
      statusCode: 400,
      referenceKind: "category",
      availableOptions: all.map((c) => `${c.id} (${c.name})`),
    });
  }
}

async function assertSlugFree(slug: string, exceptId?: string): Promise<void> {
  const clash = await prisma.product.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (clash && clash.id !== exceptId) {
    throw new CmsError(`A product with slug "${slug}" already exists.`, {
      statusCode: 409,
    });
  }
}

/**
 * Resolve each image's `variationSku` to a variation id.
 *
 * The map must be built from the variations as they exist AFTER the payload's
 * variations have been written, which is why the caller runs the variation
 * upsert first. Resolving against the pre-save state would fail for a
 * variation created in the same request — the exact case per-variation photos
 * are for.
 */
function resolveImageVariationIds(
  images: ProductInput["images"],
  skuToId: Map<string, string>,
): Array<{
  url: string;
  alt: string | null;
  altNe: string | null;
  position: number;
  variationId: string | null;
}> {
  return (images ?? []).map((img) => {
    const sku = img.variationSku ?? null;
    if (sku === null) {
      return {
        url: img.url,
        alt: img.alt ?? null,
        altNe: img.altNe ?? null,
        position: img.position,
        variationId: null,
      };
    }
    const variationId = skuToId.get(sku);
    if (!variationId) {
      throw new CmsError(`Image references unknown variationSku "${sku}".`, {
        statusCode: 400,
        referenceKind: "productVariation",
        availableOptions: [...skuToId.keys()],
      });
    }
    return {
      url: img.url,
      alt: img.alt ?? null,
      altNe: img.altNe ?? null,
      position: img.position,
      variationId,
    };
  });
}

export async function createProduct(d: ProductInput, editorEmail: string) {
  await assertSlugFree(d.slug);
  if (d.categoryId) await assertCategoryExists(d.categoryId);

  // Two steps inside one transaction, not a single nested create: an image's
  // variationId can only be known once its variation row exists, and Prisma's
  // nested `create` cannot cross-reference two siblings it is creating in the
  // same call. Product + variations first, images second.
  return prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        slug: d.slug,
        name: d.name,
        nameNe: d.nameNe ?? null,
        description: d.description,
        descriptionNe: d.descriptionNe ?? null,
        sku: d.sku ?? null,
        price: d.price,
        compareAtPrice: d.compareAtPrice ?? null,
        currency: d.currency,
        stockQuantity: d.stockQuantity ?? null,
        dimensions: d.dimensions
          ? (d.dimensions as Prisma.InputJsonValue)
          : Prisma.DbNull,
        thumbnailUrl: d.thumbnailUrl ?? null,
        vendorId: d.vendorId ?? null,
        elementSlugs: d.elementSlugs ?? [],
        categoryId: d.categoryId ?? null,
        isFeatured: d.isFeatured,
        isNewRelease: d.isNewRelease,
        priceOnEnquiry: d.priceOnEnquiry,
        position: d.position,
        status: d.status,
        publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
        tags: d.tags,
        seoTitle: d.seoTitle ?? null,
        seoTitleNe: d.seoTitleNe ?? null,
        seoDescription: d.seoDescription ?? null,
        seoDescriptionNe: d.seoDescriptionNe ?? null,
        ogImageUrl: d.ogImageUrl || null,
        canonicalUrl: d.canonicalUrl || null,
        noindex: d.noindex ?? false,
        twitterCard: d.twitterCard ?? null,
        // Reporting/wholesale fields. wholesalePrice is admin-only — the public
        // /wholesale section shows moq and an Enquire CTA, never the rate.
        legacyImsCode: d.legacyImsCode ?? null,
        qrPayload: d.qrPayload ?? null,
        wholesaleEnabled: d.wholesaleEnabled,
        wholesalePrice: d.wholesalePrice ?? null,
        moq: d.moq ?? null,
        lastEditedBy: editorEmail,
        variations: {
          create: (d.variations ?? []).map((v) => ({
            sku: v.sku,
            price: v.price,
            // Seeded here for brand-new products; afterwards `stock` is
            // materialized from the per-showroom ledger (lib/stock).
            stock: v.stock,
            attributes: v.attributes,
            label: v.label ?? null,
            color: v.color ?? null,
            size: v.size ?? null,
            dimensions: v.dimensions
              ? (v.dimensions as Prisma.InputJsonValue)
              : Prisma.DbNull,
            mrp: v.mrp ?? null,
            costPrice: v.costPrice ?? null,
            wholesalePrice: v.wholesalePrice ?? null,
            active: v.active,
          })),
        },
      },
      include: { variations: true },
    });

    for (const variation of created.variations) {
      await initializeOnlineStock(tx, variation.id, variation.stock);
    }

    const skuToId = new Map(created.variations.map((v) => [v.sku, v.id]));
    const images = resolveImageVariationIds(d.images, skuToId);
    if (images.length) {
      await tx.productImage.createMany({
        data: images.map((img) => ({ productId: created.id, ...img })),
      });
    }

    // findUniqueOrThrow, not findUnique: the row was created two statements
    // above inside this same transaction, so a null here is impossible — and
    // returning `| null` would weaken the non-null contract every existing
    // caller of createProduct already relies on.
    return tx.product.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        images: { orderBy: { position: "asc" } },
        variations: true,
      },
    });
  });
}

export async function updateProduct(
  id: string,
  d: ProductUpdateInput,
  editorEmail: string,
) {
  const existing = await prisma.product.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new CmsError(`No product with id "${id}".`, { statusCode: 404 });
  }
  await assertSlugFree(d.slug, id);
  if (d.categoryId) await assertCategoryExists(d.categoryId);

  // Replace images and variations atomically.
  return prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id },
      data: {
        slug: d.slug,
        name: d.name,
        nameNe: d.nameNe ?? null,
        description: d.description,
        descriptionNe: d.descriptionNe ?? null,
        sku: d.sku ?? null,
        price: d.price,
        compareAtPrice: d.compareAtPrice ?? null,
        currency: d.currency,
        stockQuantity: d.stockQuantity ?? null,
        dimensions: d.dimensions
          ? (d.dimensions as Prisma.InputJsonValue)
          : Prisma.DbNull,
        thumbnailUrl: d.thumbnailUrl ?? null,
        vendorId: d.vendorId ?? null,
        elementSlugs: d.elementSlugs ?? [],
        categoryId: d.categoryId ?? null,
        isFeatured: d.isFeatured,
        isNewRelease: d.isNewRelease,
        priceOnEnquiry: d.priceOnEnquiry,
        position: d.position,
        status: d.status,
        publishedAt: d.publishedAt ? new Date(d.publishedAt) : null,
        tags: d.tags,
        seoTitle: d.seoTitle ?? null,
        seoTitleNe: d.seoTitleNe ?? null,
        seoDescription: d.seoDescription ?? null,
        seoDescriptionNe: d.seoDescriptionNe ?? null,
        ogImageUrl: d.ogImageUrl || null,
        canonicalUrl: d.canonicalUrl || null,
        noindex: d.noindex ?? false,
        twitterCard: d.twitterCard ?? null,
        legacyImsCode: d.legacyImsCode ?? null,
        qrPayload: d.qrPayload ?? null,
        wholesaleEnabled: d.wholesaleEnabled,
        wholesalePrice: d.wholesalePrice ?? null,
        moq: d.moq ?? null,
        lastEditedBy: editorEmail,
      },
    });

    // Variations are written BEFORE images, and the order is load-bearing: an
    // image names its variation by SKU, and that SKU may belong to a variation
    // this very payload is creating. Resolving image -> variation before the
    // upsert loop would leave such an image permanently unassigned. Images are
    // deleted and recreated further down, once the sku -> id map is complete.
    //
    // Variations are matched by SKU rather than replaced wholesale: their ids
    // anchor the append-only stock ledger (StockLevel / StockMovement cascade
    // from ProductVariation), so delete-and-recreate would erase stock history
    // on every product edit. A variation dropped from the payload is hard
    // deleted only when it has no ledger rows; otherwise it is retired
    // (active=false) so its history survives.
    const incoming = d.variations ?? [];
    const existingVariations = await tx.productVariation.findMany({
      where: { productId: id },
      select: { id: true, sku: true },
    });
    const bySku = new Map(existingVariations.map((v) => [v.sku, v.id]));
    // Only the SKUs present in THIS payload. A variation dropped from the
    // payload is retired or deleted below, so an image may not point at it.
    const skuToId = new Map<string, string>();

    for (const v of incoming) {
      const existingId = bySku.get(v.sku);
      if (existingId) {
        // `stock` is materialized from the ledger — never overwritten here.
        await tx.productVariation.update({
          where: { id: existingId },
          data: existingVariationData(v),
        });
        skuToId.set(v.sku, existingId);
      } else {
        const createdVariation = await tx.productVariation.create({
          data: {
            productId: id,
            sku: v.sku,
            stock: v.stock,
            ...newVariationData(v),
          },
        });
        await initializeOnlineStock(tx, createdVariation.id, v.stock);
        skuToId.set(v.sku, createdVariation.id);
      }
    }

    const keptSkus = new Set(incoming.map((v) => v.sku));
    const dropped = existingVariations.filter((v) => !keptSkus.has(v.sku));
    for (const v of dropped) {
      const hasHistory = await tx.stockMovement.findFirst({
        where: { variationId: v.id },
        select: { id: true },
      });
      if (hasHistory) {
        await tx.productVariation.update({
          where: { id: v.id },
          data: { active: false },
        });
      } else {
        await tx.productVariation.delete({ where: { id: v.id } });
      }
    }

    // Images last: every SKU the payload mentions now has an id.
    await tx.productImage.deleteMany({ where: { productId: id } });
    const images = resolveImageVariationIds(d.images, skuToId);
    if (images.length) {
      await tx.productImage.createMany({
        data: images.map((img) => ({ productId: id, ...img })),
      });
    }

    return tx.product.findUnique({
      where: { id },
      include: {
        variations: true,
        images: { orderBy: { position: "asc" } },
      },
    });
  });
}
