// Shared bundle write logic, called by BOTH the REST routes
// (/api/sysuser/bundles) and the MCP tools (lib/mcp/tools/bundles.ts) so the
// two surfaces can never drift. Throws CmsError on reference/uniqueness
// failures; callers translate per transport.

import { prisma } from "@/lib/db";
import type { z } from "zod";
import type { BundleSchema } from "@/lib/validation/schemas";
import { CmsError } from "./errors";

export type BundleInput = z.infer<typeof BundleSchema>;

async function assertProductsExist(productIds: string[]): Promise<void> {
  if (!productIds.length) return;
  const found = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const missing = productIds.filter((id) => !found.some((f) => f.id === id));
  if (missing.length > 0) {
    const all = await prisma.product.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    throw new CmsError(
      `Unknown product IDs in items: ${missing.join(", ")}`,
      {
        statusCode: 400,
        referenceKind: "product",
        availableOptions: all.map((p) => `${p.id} (${p.name})`),
      },
    );
  }
}

async function assertSlugFree(slug: string, exceptId?: string): Promise<void> {
  const clash = await prisma.bundle.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (clash && clash.id !== exceptId) {
    throw new CmsError(`A bundle with slug "${slug}" already exists.`, {
      statusCode: 409,
    });
  }
}

export async function createBundle(d: BundleInput) {
  await assertSlugFree(d.slug);
  if (d.items && d.items.length > 0) {
    const ids = d.items.map((it) => it.productId);
    await assertProductsExist(ids);
  }

  return prisma.bundle.create({
    data: {
      slug: d.slug,
      title: d.title,
      description: d.description ?? null,
      price: d.price,
      compareAtPrice: d.compareAtPrice ?? null,
      thumbnailUrl: d.thumbnailUrl ?? null,
      position: d.position,
      seoTitle: d.seoTitle ?? null,
      seoDescription: d.seoDescription ?? null,
      ogImageUrl: d.ogImageUrl || null,
      canonicalUrl: d.canonicalUrl || null,
      noindex: d.noindex ?? false,
      twitterCard: d.twitterCard ?? null,
      items: {
        create: (d.items ?? []).map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          position: it.position,
        })),
      },
    },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: {
          product: { select: { id: true, name: true, thumbnailUrl: true } },
        },
      },
    },
  });
}

export async function updateBundle(
  id: string,
  d: BundleInput,
) {
  const existing = await prisma.bundle.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new CmsError(`No bundle with id "${id}".`, { statusCode: 404 });
  }
  await assertSlugFree(d.slug, id);
  if (d.items && d.items.length > 0) {
    const ids = d.items.map((it) => it.productId);
    await assertProductsExist(ids);
  }

  // Replace items atomically.
  return prisma.$transaction(async (tx) => {
    await tx.bundle.update({
      where: { id },
      data: {
        slug: d.slug,
        title: d.title,
        description: d.description ?? null,
        price: d.price,
        compareAtPrice: d.compareAtPrice ?? null,
        thumbnailUrl: d.thumbnailUrl ?? null,
        position: d.position,
        seoTitle: d.seoTitle ?? null,
        seoDescription: d.seoDescription ?? null,
        ogImageUrl: d.ogImageUrl || null,
        canonicalUrl: d.canonicalUrl || null,
        noindex: d.noindex ?? false,
        twitterCard: d.twitterCard ?? null,
      },
    });

    await tx.bundleItem.deleteMany({ where: { bundleId: id } });
    if (d.items?.length) {
      await tx.bundleItem.createMany({
        data: (d.items ?? []).map((it) => ({
          bundleId: id,
          productId: it.productId,
          quantity: it.quantity,
          position: it.position,
        })),
      });
    }

    return tx.bundle.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { position: "asc" },
          include: {
            product: { select: { id: true, name: true, thumbnailUrl: true } },
          },
        },
      },
    });
  });
}
