import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { siteUrl } from "@/lib/site-url";
import { generateUploadToken, hashUploadToken as hashToken } from "./tokens";
import type { CreateUploadSessionInput } from "@/lib/validation/schemas";

// Re-export for HTTP routes
export const hashUploadToken = hashToken;

export interface ResolvedUploadSession {
  id: string;
  tokenHash: string;
  mode: "products" | "draft";
  status: "open" | "submitted" | "cancelled";
  source: "mcp" | "telegram";
  createdBy: string;
  mcpTokenId: string | null;
  mcpTokenRevokedAt: Date | null;
  note: string | null;
  uploadCount: number;
  expiresAt: Date;
  submittedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  slots: Array<{
    id: string;
    position: number;
    productId: string | null;
    hint: string | null;
    name: string | null;
    variantLabels: string[];
    attachedAt: Date | null;
    product: {
      id: string;
      name: string;
      slug: string;
      price: number;
      sku: string | null;
      thumbnailUrl: string | null;
      variations: Array<{ id: string; sku: string; label: string | null }>;
      images: Array<{ url: string; variationId: string | null; position: number }>;
    } | null;
    files: Array<{
      id: string;
      url: string;
      variantLabel: string | null;
      variationSku: string | null;
      position: number;
    }>;
  }>;
}

/**
 * Create a new upload session.
 * Returns the session, the raw token (shown once), and the public URL.
 */
export async function createUploadSession(
  input: CreateUploadSessionInput & { source: "mcp" | "telegram"; createdBy: string; mcpTokenId?: string },
): Promise<{ session: ResolvedUploadSession; token: string; url: string }> {
  // Validate XOR: exactly one of productIds or newProducts must be supplied
  const hasProductIds = input.productIds && input.productIds.length > 0;
  const hasNewProducts = input.newProducts && input.newProducts.count > 0;
  if ((hasProductIds && hasNewProducts) || (!hasProductIds && !hasNewProducts)) {
    throw new CmsError("Supply either productIds (1..20) or newProducts (count: 1..30), not both or neither.", {
      statusCode: 400,
    });
  }

  const token = generateUploadToken();
  const tokenHash = hashUploadToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.expiresInHours * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    // Validate all product IDs exist if in products mode
    if (hasProductIds) {
      const found = await tx.product.findMany({
        where: { id: { in: input.productIds! } },
        select: { id: true },
      });
      if (found.length !== input.productIds!.length) {
        const availIds = await tx.product.findMany({
          select: { id: true, name: true },
          orderBy: { createdAt: "desc" },
          take: 20,
        });
        throw new CmsError("Some productIds do not exist.", {
          statusCode: 400,
          referenceKind: "product",
          availableOptions: availIds.map((p) => `${p.id} (${p.name})`),
        });
      }
    }

    const sessionData: Prisma.UploadSessionCreateInput = {
      tokenHash,
      mode: input.mode,
      status: "open",
      source: input.source,
      createdBy: input.createdBy,
      ...(input.mcpTokenId ? { mcpToken: { connect: { id: input.mcpTokenId } } } : {}),
      note: input.note || null,
      expiresAt,
    };

    await tx.uploadSession.create({
      data: {
        ...sessionData,
        slots: {
          create: hasProductIds
            ? input.productIds!.map((productId, i) => ({
                position: i,
                productId,
              }))
            : Array.from({ length: input.newProducts!.count }, (_, i) => ({
                position: i,
                hint: input.newProducts!.hints?.[i] || null,
              })),
        },
      },
    });
  });

  // Resolve AFTER transaction commits so the row is visible to the global client
  const resolved = await resolveUploadSessionByHash(tokenHash);
  if (!resolved) {
    throw new Error("Session created but not resolvable");
  }

  return { session: resolved, token, url: getSessionUrl(token) };
}

/**
 * Resolve a raw token (from URL) to its session.
 */
export async function resolveUploadSession(token: string): Promise<ResolvedUploadSession | null> {
  const tokenHash = hashUploadToken(token);
  return resolveUploadSessionByHash(tokenHash);
}

/**
 * Resolve a token hash to its session and slots with product details.
 * Returns null if expired, revoked, cancelled, or mcpToken is revoked.
 */
export async function resolveUploadSessionByHash(tokenHash: string): Promise<ResolvedUploadSession | null> {

  const session = await prisma.uploadSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      tokenHash: true,
      mode: true,
      status: true,
      source: true,
      createdBy: true,
      mcpTokenId: true,
      mcpToken: {
        select: { revokedAt: true },
      },
      note: true,
      uploadCount: true,
      expiresAt: true,
      submittedAt: true,
      revokedAt: true,
      createdAt: true,
      updatedAt: true,
      slots: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          productId: true,
          hint: true,
          name: true,
          variantLabels: true,
          attachedAt: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              sku: true,
              thumbnailUrl: true,
              variations: {
                where: { active: true },
                select: { id: true, sku: true, label: true },
              },
              images: {
                select: { url: true, variationId: true, position: true },
              },
            },
          },
          files: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              url: true,
              variantLabel: true,
              variationSku: true,
              position: true,
            },
          },
        },
      },
    },
  });

  if (!session) return null;
  if (new Date() > session.expiresAt) return null;
  if (session.status === "cancelled") return null;
  if (session.revokedAt) return null;
  if (session.mcpToken?.revokedAt) return null;

  return {
    id: session.id,
    tokenHash: session.tokenHash,
    mode: session.mode as "products" | "draft",
    status: session.status as "open" | "submitted" | "cancelled",
    source: session.source as "mcp" | "telegram",
    createdBy: session.createdBy,
    mcpTokenId: session.mcpTokenId,
    mcpTokenRevokedAt: session.mcpToken?.revokedAt || null,
    note: session.note,
    uploadCount: session.uploadCount,
    expiresAt: session.expiresAt,
    submittedAt: session.submittedAt,
    revokedAt: session.revokedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    slots: session.slots,
  };
}

/**
 * Get the public URL for an upload session.
 */
function getSessionUrl(token: string): string {
  return `${siteUrl}/upload/${token}`;
}

/**
 * Submit an upload session (idempotent). Still uploadable until expiry.
 */
export async function submitUploadSession(session: ResolvedUploadSession): Promise<ResolvedUploadSession> {
  if (session.status === "submitted") {
    return session;
  }

  await prisma.uploadSession.update({
    where: { id: session.id },
    data: {
      status: "submitted",
      submittedAt: new Date(),
    },
  });

  const updated = await resolveUploadSessionByHash(session.tokenHash);
  if (!updated) throw new Error("Session became invalid after update");
  return updated;
}

/**
 * Cancel an upload session (idempotent).
 */
export async function cancelUploadSession(id: string): Promise<ResolvedUploadSession> {
  const session = await prisma.uploadSession.findUnique({
    where: { id },
    select: { tokenHash: true },
  });
  if (!session) {
    throw new CmsError(`Upload session not found: ${id}`, { statusCode: 404 });
  }

  await prisma.uploadSession.update({
    where: { id },
    data: { revokedAt: new Date(), status: "cancelled" },
  });

  const resolved = await resolveUploadSessionByHash(session.tokenHash);
  if (!resolved) throw new Error("Session became invalid after cancellation");
  return resolved;
}

/**
 * Get full session details for MCP response (including all slots with files).
 * Allows reading expired sessions since MCP reads are post-upload reviews.
 */
export async function getUploadSessionDetail(id: string): Promise<ResolvedUploadSession> {
  const session = await prisma.uploadSession.findUnique({
    where: { id },
    select: {
      id: true,
      tokenHash: true,
      mode: true,
      status: true,
      source: true,
      createdBy: true,
      mcpTokenId: true,
      mcpToken: { select: { revokedAt: true } },
      note: true,
      uploadCount: true,
      expiresAt: true,
      submittedAt: true,
      revokedAt: true,
      createdAt: true,
      updatedAt: true,
      slots: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          productId: true,
          hint: true,
          name: true,
          variantLabels: true,
          attachedAt: true,
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              sku: true,
              thumbnailUrl: true,
              variations: {
                where: { active: true },
                select: { id: true, sku: true, label: true },
              },
              images: {
                select: { url: true, variationId: true, position: true },
              },
            },
          },
          files: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              url: true,
              variantLabel: true,
              variationSku: true,
              position: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    throw new CmsError(`Upload session not found: ${id}`, { statusCode: 404 });
  }

  // Check if cancelled or MCP token revoked (these are permanent blocks)
  if (session.status === "cancelled" || session.revokedAt) {
    throw new CmsError("Session has been cancelled.", { statusCode: 410 });
  }
  if (session.mcpToken?.revokedAt) {
    throw new CmsError("Session token has been revoked.", { statusCode: 410 });
  }

  // Return the session (even if expired, MCP can still read what was uploaded)
  return {
    id: session.id,
    tokenHash: session.tokenHash,
    mode: session.mode as "products" | "draft",
    status: session.status as "open" | "submitted" | "cancelled",
    source: session.source as "mcp" | "telegram",
    createdBy: session.createdBy,
    mcpTokenId: session.mcpTokenId,
    mcpTokenRevokedAt: session.mcpToken?.revokedAt || null,
    note: session.note,
    uploadCount: session.uploadCount,
    expiresAt: session.expiresAt,
    submittedAt: session.submittedAt,
    revokedAt: session.revokedAt,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    slots: session.slots,
  };
}

export interface UploadSessionView {
  id: string;
  mode: "products" | "draft";
  status: "open" | "submitted" | "cancelled";
  expiresAt: Date;
  submittedAt: Date | null;
  note: string | null;
  uploadCount: number;
  slots: Array<{
    id: string;
    position: number;
    name: string | null;
    hint: string | null;
    variantLabels: string[];
    product: {
      id: string;
      name: string;
      slug: string;
      price: number;
      sku: string | null;
      thumbnailUrl: string | null;
      variations: Array<{ id: string; sku: string; label: string | null }>;
      images: Array<{ url: string; variationId: string | null; position: number }>;
    } | null;
    files: Array<{
      id: string;
      url: string;
      variantLabel: string | null;
      variationSku: string | null;
      position: number;
    }>;
  }>;
}

/**
 * Create an explicit public DTO from a resolved session.
 * Removes admin-only fields and sensitive details.
 */
export function toUploadSessionView(session: ResolvedUploadSession): UploadSessionView {
  return {
    id: session.id,
    mode: session.mode,
    status: session.status,
    expiresAt: session.expiresAt,
    submittedAt: session.submittedAt,
    note: session.note,
    uploadCount: session.uploadCount,
    slots: session.slots.map((slot) => ({
      id: slot.id,
      position: slot.position,
      name: slot.name,
      hint: slot.hint,
      variantLabels: slot.variantLabels,
      product: slot.product
        ? {
            id: slot.product.id,
            name: slot.product.name,
            slug: slot.product.slug,
            price: slot.product.price,
            sku: slot.product.sku,
            thumbnailUrl: slot.product.thumbnailUrl,
            variations: slot.product.variations,
            images: slot.product.images,
          }
        : null,
      files: slot.files.map((f) => ({
        id: f.id,
        url: f.url,
        variantLabel: f.variantLabel,
        variationSku: f.variationSku,
        position: f.position,
      })),
    })),
  };
}
