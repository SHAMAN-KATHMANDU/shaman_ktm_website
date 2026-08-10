// Shared product write logic, called by BOTH the REST routes
// (/api/sysuser/products) and the MCP tools (lib/mcp/tools/products.ts) so the
// two surfaces can never drift. Throws CmsError on reference/uniqueness
// failures; callers translate per transport.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { z } from "zod";
import type { ProductSchema } from "@/lib/validation/schemas";
import { CmsError } from "./errors";

export type ProductInput = z.infer<typeof ProductSchema>;

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

export async function createProduct(d: ProductInput, editorEmail: string) {
  await assertSlugFree(d.slug);
  if (d.categoryId) await assertCategoryExists(d.categoryId);

  return prisma.product.create({
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
      images: {
        create: (d.images ?? []).map((img) => ({
          url: img.url,
          alt: img.alt ?? null,
          altNe: img.altNe ?? null,
          position: img.position,
        })),
      },
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
    include: { images: true, variations: true },
  });
}

export async function updateProduct(
  id: string,
  d: ProductInput,
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

    await tx.productImage.deleteMany({ where: { productId: id } });
    if (d.images?.length ?? 0) {
      await tx.productImage.createMany({
        data: (d.images ?? []).map((img) => ({
          productId: id,
          url: img.url,
          alt: img.alt ?? null,
          altNe: img.altNe ?? null,
          position: img.position,
        })),
      });
    }

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

    for (const v of incoming) {
      const variationData = {
        price: v.price,
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
      };
      const existingId = bySku.get(v.sku);
      if (existingId) {
        // `stock` is materialized from the ledger — never overwritten here.
        await tx.productVariation.update({
          where: { id: existingId },
          data: variationData,
        });
      } else {
        await tx.productVariation.create({
          data: {
            productId: id,
            sku: v.sku,
            stock: v.stock,
            ...variationData,
          },
        });
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

    return tx.product.findUnique({
      where: { id },
      include: {
        variations: true,
        images: { orderBy: { position: "asc" } },
      },
    });
  });
}
