import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { signMediaUpload, confirmMediaUpload } from "@/lib/cms/media";
import { slugify } from "@/lib/slug";
import { addVariation, nextVariationSku } from "@/lib/cms/products";
import { logAction } from "@/lib/audit";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { MAX_DIRECT_UPLOAD_BYTES } from "@/lib/cms/media-limits";
import type { ResolvedUploadSession } from "./session";
import type { AddVariantInput } from "@/lib/validation/schemas";

const UPLOAD_CAP = 200;

// Every object signed for a session lives under its own prefix, so confirm can
// refuse keys this session never signed — a leaked link must not be able to
// attach arbitrary objects already in the bucket.
export function sessionKeyDir(sessionId: string): string {
  return `uploads/sessions/${sessionId}`;
}

type Db = Prisma.TransactionClient;

/**
 * Sign an upload request.
 * Validates slot membership, mime/size, and caps.
 */
export async function signSessionUpload(
  session: ResolvedUploadSession,
  input: { slotId: string; filename: string; contentType: string; bytes: number },
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  // Validate upload count and slot membership
  if (session.uploadCount >= UPLOAD_CAP) {
    throw new CmsError(`Upload cap (${UPLOAD_CAP} files) reached.`, { statusCode: 429 });
  }

  const slot = session.slots.find((s) => s.id === input.slotId);
  if (!slot) {
    throw new CmsError("Slot not found in session.", { statusCode: 400 });
  }

  // Delegate to media guards via signMediaUpload
  const { uploadUrl, publicUrl, key } = await signMediaUpload(
    {
      filename: input.filename,
      contentType: input.contentType,
      bytes: input.bytes,
    },
    sessionKeyDir(session.id),
  );

  return { uploadUrl, publicUrl, key };
}

/**
 * Confirm an upload and attach to product/slot.
 * In products mode: attaches to product image gallery with optional variationSku.
 * In draft mode: creates UploadFile row for later attachment with variantLabel.
 *
 * Confirms media upload BEFORE the transaction (acceptable to have orphan Media
 * rows if the tx fails later; they are harmless and can be cleaned up in v2).
 */
export async function confirmSessionUpload(
  session: ResolvedUploadSession,
  input: { slotId: string; key: string; variationSku?: string; variantLabel?: string; alt?: string },
): Promise<void> {
  // Validate slot membership
  const slot = session.slots.find((s) => s.id === input.slotId);
  if (!slot) {
    throw new CmsError("Slot not found in session.", { statusCode: 400 });
  }

  // Validate mode-specific parameters
  if (session.mode === "products") {
    if (input.variantLabel) {
      throw new CmsError("variantLabel is not allowed in products mode.", { statusCode: 400 });
    }
    // variationSku is optional in products mode; validate if provided
    if (input.variationSku && slot.product) {
      const variation = slot.product.variations.find((v) => v.sku === input.variationSku);
      if (!variation) {
        throw new CmsError(`Variation SKU "${input.variationSku}" not found on product.`, {
          statusCode: 400,
        });
      }
    }
  } else {
    // Draft mode
    if (input.variationSku) {
      throw new CmsError("variationSku is not allowed in draft mode.", { statusCode: 400 });
    }
    // variantLabel is optional in draft mode; validate if provided
    if (input.variantLabel && !slot.variantLabels.includes(input.variantLabel)) {
      throw new CmsError(
        `Variant label "${input.variantLabel}" not found in slot. Available: ${slot.variantLabels.join(", ")}`,
        { statusCode: 400 },
      );
    }
  }

  // Confirm the media upload (this verifies it exists in S3)
  // Called BEFORE the transaction so we can use the Media row FK inside it
  if (
    !input.key.startsWith(`${sessionKeyDir(session.id)}/`) ||
    input.key.includes("..")
  ) {
    throw new CmsError("Unknown upload key for this link.", { statusCode: 400 });
  }
  const { row: media } = await confirmMediaUpload(
    {
      key: input.key,
      alt: input.alt || null,
    },
    MAX_DIRECT_UPLOAD_BYTES,
  );

  return prisma.$transaction(async (tx) => {
    // Atomically enforce upload cap FIRST (takes session lock, serializes confirms)
    const updated = await tx.uploadSession.updateMany({
      where: { id: session.id, uploadCount: { lt: UPLOAD_CAP } },
      data: { uploadCount: { increment: 1 } },
    });
    if (updated.count === 0) {
      throw new CmsError(`Upload cap (${UPLOAD_CAP} files) reached.`, { statusCode: 429 });
    }

    if (session.mode === "products" && slot.product) {
      // Compute next position atomically from current DB state
      const maxPos = await tx.productImage.aggregate({
        where: { productId: slot.product.id },
        _max: { position: true },
      });
      const nextPosition = (maxPos._max.position ?? -1) + 1;

      // Attach to product image gallery
      const variation = input.variationSku
        ? slot.product.variations.find((v) => v.sku === input.variationSku)
        : undefined;
      const variationId = variation?.id ?? null;

      await tx.productImage.create({
        data: {
          productId: slot.product.id,
          url: media.url, // Use Media.url, not client-supplied publicUrl
          alt:
            input.alt ||
            [slot.product.name, variation?.label].filter(Boolean).join(" — "),
          position: nextPosition,
          variationId,
        },
      });

      // Create UploadFile row for audit/tracking
      await tx.uploadFile.create({
        data: {
          slotId: input.slotId,
          mediaId: media.id,
          url: media.url,
          variationSku: input.variationSku || null,
          position: nextPosition,
        },
      });

      // If no thumbnail, set this as thumbnail
      if (!slot.product.thumbnailUrl) {
        await tx.product.update({
          where: { id: slot.product.id },
          data: { thumbnailUrl: media.url },
        });
      }

      // Audit and cache
      logAction({
        actor: `upload:${session.createdBy}`,
        action: "update",
        entity: "Product",
        entityId: slot.product.id,
        summary: `+1 image via upload session`,
      });
      bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage, CACHE_TAGS.collections, CACHE_TAGS.bundles);
    } else {
      // Draft mode: create UploadFile row with variantLabel
      // Compute next position atomically
      const maxPos = await tx.uploadFile.aggregate({
        where: { slotId: input.slotId },
        _max: { position: true },
      });
      const nextPosition = (maxPos._max.position ?? -1) + 1;

      await tx.uploadFile.create({
        data: {
          slotId: input.slotId,
          mediaId: media.id,
          url: media.url,
          variantLabel: input.variantLabel || null,
          position: nextPosition,
        },
      });
    }
  });
}

/**
 * Add a variant to a product in the session.
 * Products mode: creates real ProductVariation, returns {sku, label}.
 * Draft mode: appends label to slot.variantLabels, returns {label} (no sku yet).
 */
export async function addSessionVariant(
  session: ResolvedUploadSession,
  slotId: string,
  input: AddVariantInput,
): Promise<{ sku?: string; label: string }> {
  const slot = session.slots.find((s) => s.id === slotId);
  if (!slot) {
    throw new CmsError("Slot not found in session.", { statusCode: 400 });
  }

  if (session.mode === "products") {
    if (!slot.product) {
      throw new CmsError("Product not found for slot.", { statusCode: 400 });
    }

    // Cap variant count (same as draft mode cap at line 231)
    if (slot.product.variations.length >= 20) {
      throw new CmsError("Variant cap (20) reached for this product.", { statusCode: 429 });
    }

    return prisma.$transaction(async (tx) => {
      // Generate unique SKU using shared helper (queries inside tx)
      const sku = await nextVariationSku(
        tx,
        slot.product!.id,
        slot.product!.sku,
        slot.product!.slug,
        input.label,
      );

      // Create variation at product price
      const variation = await addVariation(tx, slot.product!.id, {
        sku,
        price: slot.product!.price,
        label: input.label,
        color: input.color,
        size: input.size,
        stock: 0,
        active: true,
      });

      return { sku: variation.sku, label: input.label };
    });
  } else {
    // Draft mode: append to variantLabels. Read the current list fresh and
    // append atomically — rewriting the snapshot's list would drop a label
    // added by a parallel request.
    const current = await prisma.uploadSlot.findUniqueOrThrow({
      where: { id: slotId },
      select: { variantLabels: true },
    });
    if (current.variantLabels.includes(input.label)) {
      return { label: input.label };
    }
    if (current.variantLabels.length >= 20) {
      throw new CmsError("Variant label cap (20) reached.", { statusCode: 429 });
    }

    await prisma.uploadSlot.update({
      where: { id: slotId },
      data: { variantLabels: { push: input.label } },
    });

    return { label: input.label };
  }
}

/**
 * Add a new draft slot (draft mode only).
 */
export async function addDraftSlot(session: ResolvedUploadSession): Promise<{ slotId: string; position: number }> {
  if (session.mode !== "draft") {
    throw new CmsError("Can only add slots in draft mode.", { statusCode: 400 });
  }

  if (session.slots.length >= 30) {
    throw new CmsError("Slot cap (30) reached.", { statusCode: 429 });
  }

  const newSlot = await prisma.uploadSlot.create({
    data: {
      sessionId: session.id,
      position: session.slots.length,
    },
  });

  return { slotId: newSlot.id, position: newSlot.position };
}

/**
 * Rename a draft slot.
 * Validates that the slot belongs to the session.
 */
export async function renameDraftSlot(session: ResolvedUploadSession, slotId: string, name: string | null): Promise<void> {
  const slot = session.slots.find((s) => s.id === slotId);
  if (!slot) {
    throw new CmsError("Slot not found in session.", { statusCode: 400 });
  }

  await prisma.uploadSlot.update({
    where: { id: slotId },
    data: { name },
  });
}
