import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { addVariation, nextVariationSku } from "@/lib/cms/products";
import { logAction } from "@/lib/audit";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";

/**
 * Attach a draft upload slot to a product.
 * - Creates variations from variantLabels at product price.
 * - Appends UploadFile rows as ProductImages.
 * - Sets productId and attachedAt on the slot.
 * - Idempotent: re-running doesn't duplicate images or variations.
 */
export async function attachUploadSlot(input: { sessionId: string; slotId: string; productId: string; actor: string }): Promise<void> {
  const { sessionId, slotId, productId, actor } = input;

  const slot = await prisma.uploadSlot.findUnique({
    where: { id: slotId },
    select: {
      sessionId: true,
      session: { select: { mode: true } },
      productId: true,
      variantLabels: true,
      files: { select: { id: true, url: true, variantLabel: true } },
    },
  });

  if (!slot) {
    throw new CmsError("Slot not found.", { statusCode: 404 });
  }

  if (slot.sessionId !== sessionId) {
    throw new CmsError("Slot does not belong to this session.", { statusCode: 400 });
  }

  if (slot.session.mode === "media") {
    throw new CmsError(
      "This is a media upload slot — use set_entity_image (or add_product_images) with the uploaded file urls instead.",
      { statusCode: 400 },
    );
  }

  // Check if already attached to a different product
  if (slot.productId && slot.productId !== productId) {
    throw new CmsError(`Slot already attached to product ${slot.productId}.`, { statusCode: 409 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      price: true,
      sku: true,
      slug: true,
      variations: { select: { id: true, sku: true, label: true } },
      images: { select: { url: true, variationId: true, position: true } },
    },
  });

  if (!product) {
    throw new CmsError("Product not found.", { statusCode: 404 });
  }

  return prisma.$transaction(async (tx) => {
    // Process variant labels: create variations if they don't exist
    // Map label → { id, sku } for both existing and newly created variations
    const labelToVariation = new Map<string, { id: string; sku: string }>();

    for (const label of slot.variantLabels || []) {
      // Check if variation with this label already exists
      const existing = product.variations.find((v) => v.label === label);
      if (existing) {
        labelToVariation.set(label, { id: existing.id, sku: existing.sku });
      } else {
        // Generate unique SKU using shared helper (queries inside tx)
        const sku = await nextVariationSku(
          tx,
          productId,
          product.sku,
          product.slug,
          label,
        );

        // Create new variation at product price
        const variation = await addVariation(tx, productId, {
          sku,
          price: product.price,
          label,
          stock: 0,
          active: true,
        });
        labelToVariation.set(label, { id: variation.id, sku: variation.sku });
      }
    }

    // Attach files as ProductImages (skip if URL already exists on product)
    const existingUrls = new Set(product.images.map((img) => img.url));

    // Compute next position atomically
    const maxPos = await tx.productImage.aggregate({
      where: { productId },
      _max: { position: true },
    });
    let nextPosition = (maxPos._max.position ?? -1) + 1;

    for (const file of slot.files) {
      if (existingUrls.has(file.url)) {
        // Skip: already attached
        continue;
      }

      const variation = file.variantLabel ? labelToVariation.get(file.variantLabel) : null;
      const variationId = variation?.id || null;
      const variationSku = variation?.sku || null;

      // Generate alt text from product name and variant if applicable
      // Same shape as confirmSessionUpload: "Name — Variant label".
      const alt = [product.name, file.variantLabel].filter(Boolean).join(" — ");

      await tx.productImage.create({
        data: {
          productId,
          url: file.url,
          alt,
          position: nextPosition++,
          variationId,
        },
      });

      // Mark the file with the variation SKU for audit/tracking
      if (variationSku) {
        await tx.uploadFile.update({
          where: { id: file.id },
          data: { variationSku },
        });
      }
    }

    // Mark slot as attached
    await tx.uploadSlot.update({
      where: { id: slotId },
      data: { productId, attachedAt: new Date() },
    });

    // Audit
    logAction({
      actor: `upload:${actor}`,
      action: "update",
      entity: "Product",
      entityId: productId,
      summary: `+${slot.files.length} image(s) from upload session`,
    });
    bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage, CACHE_TAGS.collections, CACHE_TAGS.bundles);
  });
}
