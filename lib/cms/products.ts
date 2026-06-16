// Shared product write logic, called by BOTH the REST routes
// (/api/sysuser/products) and the MCP tools (lib/mcp/tools/products.ts) so the
// two surfaces can never drift. Throws CmsError on reference/uniqueness
// failures; callers translate per transport.

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
      description: d.description,
      sku: d.sku ?? null,
      price: d.price,
      compareAtPrice: d.compareAtPrice ?? null,
      currency: d.currency,
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
      seoDescription: d.seoDescription ?? null,
      ogImageUrl: d.ogImageUrl || null,
      canonicalUrl: d.canonicalUrl || null,
      noindex: d.noindex ?? false,
      twitterCard: d.twitterCard ?? null,
      lastEditedBy: editorEmail,
      images: {
        create: (d.images ?? []).map((img) => ({
          url: img.url,
          alt: img.alt ?? null,
          position: img.position,
        })),
      },
      variations: {
        create: (d.variations ?? []).map((v) => ({
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          attributes: v.attributes,
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
        description: d.description,
        sku: d.sku ?? null,
        price: d.price,
        compareAtPrice: d.compareAtPrice ?? null,
        currency: d.currency,
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
        seoDescription: d.seoDescription ?? null,
        ogImageUrl: d.ogImageUrl || null,
        canonicalUrl: d.canonicalUrl || null,
        noindex: d.noindex ?? false,
        twitterCard: d.twitterCard ?? null,
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
          position: img.position,
        })),
      });
    }

    await tx.productVariation.deleteMany({ where: { productId: id } });
    if (d.variations?.length ?? 0) {
      await tx.productVariation.createMany({
        data: (d.variations ?? []).map((v) => ({
          productId: id,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          attributes: v.attributes,
        })),
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
