// Shared collection write logic, called by BOTH the REST routes
// (/api/sysuser/collections) and the MCP tools (lib/mcp/tools/collections.ts) so the
// two surfaces can never drift. Throws CmsError on reference/uniqueness
// failures; callers translate per transport.

import { prisma } from "@/lib/db";
import type { z } from "zod";
import type { CollectionSchema } from "@/lib/validation/schemas";
import { CmsError } from "./errors";

export type CollectionInput = z.infer<typeof CollectionSchema>;

async function assertProductsExist(productIds: string[]): Promise<void> {
  if (!productIds.length) return;
  const found = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const missing = productIds.filter((pid) => !found.some((f) => f.id === pid));
  if (missing.length > 0) {
    const available = found.map((p) => `${p.id} (${p.name})`);
    throw new CmsError(`Unknown product IDs: ${missing.join(", ")}`, {
      statusCode: 400,
      referenceKind: "product",
      availableOptions: available,
    });
  }
}

async function assertSlugFree(slug: string, exceptId?: string): Promise<void> {
  const clash = await prisma.collection.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (clash && clash.id !== exceptId) {
    throw new CmsError(`A collection with slug "${slug}" already exists.`, {
      statusCode: 409,
    });
  }
}

export async function createCollection(d: CollectionInput) {
  await assertSlugFree(d.slug);
  await assertProductsExist(d.productIds ?? []);

  return prisma.collection.create({
    data: {
      slug: d.slug,
      title: d.title,
      subtitle: d.subtitle ?? null,
      heroImageUrl: d.heroImageUrl ?? null,
      position: d.position,
      seoTitle: d.seoTitle ?? null,
      seoDescription: d.seoDescription ?? null,
      ogImageUrl: d.ogImageUrl || null,
      canonicalUrl: d.canonicalUrl || null,
      noindex: d.noindex ?? false,
      twitterCard: d.twitterCard ?? null,
      products: {
        create: (d.productIds ?? []).map((productId, idx) => ({
          productId,
          position: idx,
        })),
      },
    },
    include: { _count: { select: { products: true } } },
  });
}

export async function updateCollection(
  id: string,
  d: CollectionInput,
) {
  const existing = await prisma.collection.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new CmsError(`No collection with id "${id}".`, { statusCode: 404 });
  }
  await assertSlugFree(d.slug, id);
  await assertProductsExist(d.productIds ?? []);

  // Replace products atomically.
  return prisma.$transaction(async (tx) => {
    await tx.collection.update({
      where: { id },
      data: {
        slug: d.slug,
        title: d.title,
        subtitle: d.subtitle ?? null,
        heroImageUrl: d.heroImageUrl ?? null,
        position: d.position,
        seoTitle: d.seoTitle ?? null,
        seoDescription: d.seoDescription ?? null,
        ogImageUrl: d.ogImageUrl || null,
        canonicalUrl: d.canonicalUrl || null,
        noindex: d.noindex ?? false,
        twitterCard: d.twitterCard ?? null,
      },
    });

    await tx.collectionProduct.deleteMany({ where: { collectionId: id } });
    if ((d.productIds?.length ?? 0)) {
      await tx.collectionProduct.createMany({
        data: (d.productIds ?? []).map((productId, idx) => ({
          collectionId: id,
          productId,
          position: idx,
        })),
        skipDuplicates: true,
      });
    }

    return tx.collection.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { position: "asc" },
          include: {
            product: { select: { id: true, name: true, thumbnailUrl: true } },
          },
        },
      },
    });
  });
}
