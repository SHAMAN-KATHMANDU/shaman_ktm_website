// MCP tools for upload sessions: short-lived photo upload pages for product listing.
// Users can upload photos and variants without the assistant having the bytes.

import { z } from "zod";
import sharp from "sharp";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  createUploadSession,
  getUploadSessionDetail,
  cancelUploadSession,
} from "@/lib/upload-sessions";
import { attachUploadSlot } from "@/lib/upload-sessions/attach";
import { logAction } from "@/lib/audit";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { s3PublicUrl } from "@/lib/s3";
import { prisma } from "@/lib/db";
import { mcpJson, mcpError, requireMcpRole, type McpToolResult } from "../respond";
import type { McpContext } from "../auth";

// Input schemas (without mode; derived from XOR of productIds/newProducts)
const CreateUploadSessionInputSchema = z.object({
  productIds: z.string().min(1).array().min(1).max(20).optional(),
  newProducts: z
    .object({
      count: z.number().int().min(1).max(30),
      hints: z.string().array().optional(),
    })
    .optional(),
  expiresInHours: z.number().int().min(1).max(12).default(12),
  note: z.string().max(1000).optional(),
});

const GetUploadSessionInputSchema = z.object({
  id: z.string().cuid(),
  includeImages: z.boolean().default(true),
});

const AttachUploadSlotInputSchema = z.object({
  sessionId: z.string().cuid(),
  slotId: z.string().cuid(),
  productId: z.string().min(1),
});

const CancelUploadSessionInputSchema = z.object({
  id: z.string().cuid(),
});

/**
 * Collect images from a session's slots, capped at 24 total.
 * Returns metadata for each image (slot, variant, url, isVideo) and truncation count.
 */
async function collectSessionImages(
  session: Awaited<ReturnType<typeof getUploadSessionDetail>>,
): Promise<{ items: Array<{ slotLabel: string; variantLabel: string | null; url: string; isVideo: boolean }> }> {
  const items: Array<{ slotLabel: string; variantLabel: string | null; url: string; isVideo: boolean }> = [];
  const maxImages = 24;

  for (const slot of session.slots) {
    const slotLabel = slot.product?.name || slot.name || slot.hint || `Slot ${slot.position + 1}`;

    // In products mode: use slot.product.images
    if (session.mode === "products" && slot.product) {
      for (const img of slot.product.images) {
        if (items.length >= maxImages) break;

        // Find variant label from variation id
        let variantLabel: string | null = null;
        if (img.variationId) {
          const variation = slot.product.variations.find((v) => v.id === img.variationId);
          variantLabel = variation?.label || null;
        }

        const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(img.url);
        items.push({ slotLabel, variantLabel, url: img.url, isVideo });
      }
    } else {
      // In draft mode: use slot.files
      for (const file of slot.files) {
        if (items.length >= maxImages) break;

        const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(file.url);
        items.push({
          slotLabel,
          variantLabel: file.variantLabel,
          url: file.url,
          isVideo,
        });
      }
    }

    if (items.length >= maxImages) break;
  }

  return { items };
}

/**
 * Fetch and resize an image to max 768px JPEG q75, with error handling.
 * Only fetches from S3 public URLs to prevent SSRF.
 */
async function resizeImageForMcp(url: string): Promise<{ data: string; mimeType: "image/jpeg" } | null> {
  try {
    // Only our own bucket's public URLs — these urls come from DB rows, but a
    // product image can be any editor-entered link, so never fetch elsewhere.
    const ownBase = s3PublicUrl("");
    if (!url.startsWith(ownBase) || new URL(url).origin !== new URL(ownBase).origin) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    // Cap at 25 MB (same as MAX_FETCH_BYTES in media-guards)
    if (buffer.byteLength > 25 * 1024 * 1024) return null;

    const resized = await sharp(Buffer.from(buffer))
      .resize(768, 768, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 75, progressive: true })
      .toBuffer();

    return {
      data: resized.toString("base64"),
      mimeType: "image/jpeg" as const,
    };
  } catch {
    return null;
  }
}

export function registerUploadSessionTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "create_upload_session",
    {
      title: "Create upload session (for photos in chat)",
      description: [
        "Create a short-lived URL for the user to upload photos directly to the CMS without sending file bytes through the chat.",
        "Pass either productIds (assistant already created draft products) OR newProducts (count: 1–30, user will upload first). Not both.",
        "expiresInHours: 1–12 (default 12). Note: optional message shown at the top of the upload page.",
        "Returns {id, url, expiresAt, mode, slots:[{productId?, position, name?, hint?, variantLabels}]}.",
        "CRITICAL: Send the raw url to the user verbatim. It expires in expiresInHours and works on phones (drag & drop / file picker).",
        "When the user says done uploading, call get_upload_session to see what came in.",
      ].join("\n"),
      inputSchema: CreateUploadSessionInputSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = CreateUploadSessionInputSchema.parse(args);

        // Derive mode from XOR of inputs
        const hasProductIds = d.productIds && d.productIds.length > 0;
        const hasNewProducts = d.newProducts && d.newProducts.count > 0;
        if ((hasProductIds && hasNewProducts) || (!hasProductIds && !hasNewProducts)) {
          throw new Error("Supply either productIds (1..20) or newProducts (count: 1..30), not both or neither.");
        }

        const mode: "products" | "draft" = hasProductIds ? "products" : "draft";

        const { session, url } = await createUploadSession({
          mode,
          productIds: hasProductIds ? d.productIds : undefined,
          newProducts: hasNewProducts ? d.newProducts : undefined,
          expiresInHours: d.expiresInHours,
          note: d.note,
          source: "mcp",
          createdBy: ctx.tokenName,
          mcpTokenId: ctx.tokenId,
        });

        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "UploadSession",
          entityId: session.id,
          summary: `${mode} mode, ${session.slots.length} slot(s), expires in ${d.expiresInHours}h`,
        });

        return mcpJson({
          id: session.id,
          url,
          expiresAt: session.expiresAt,
          mode: session.mode,
          slots: session.slots.map((s) => ({
            slotId: s.id,
            position: s.position,
            productId: s.productId,
            name: s.name,
            hint: s.hint,
            variantLabels: s.variantLabels,
          })),
        });
      } catch (err) {
        return mcpError(err, "create_upload_session failed");
      }
    },
  );

  server.registerTool(
    "get_upload_session",
    {
      title: "Get upload session (review what was uploaded)",
      description: [
        "Retrieve a completed upload session with all images/videos and variant labels.",
        "Returns JSON metadata plus MCP image content blocks (one per photo, max 24, resized to 768px JPEG q75).",
        "Each image is preceded by a text block naming the slot and variant (e.g. 'Slot 2 (the blue turtle) · variant Large — <url>').",
        "Use this after the user says done. Image blocks let you see the photos in Claude Desktop / claude.ai, then review products and ask to publish.",
      ].join("\n"),
      inputSchema: GetUploadSessionInputSchema.shape,
    },
    async (args) => {
      try {
          requireMcpRole(ctx, "viewer");
          const d = GetUploadSessionInputSchema.parse(args);

          const session = await getUploadSessionDetail(d.id);
          const { items } = await collectSessionImages(session);

          // Build content blocks
          const content: McpToolResult["content"] = [];

          // Add JSON summary first
          content.push({
            type: "text",
            text: JSON.stringify({
              id: session.id,
              mode: session.mode,
              status: session.status,
              createdBy: session.createdBy,
              expiresAt: session.expiresAt,
              submittedAt: session.submittedAt,
              uploadCount: session.uploadCount,
              slots: session.slots.map((s) => ({
                slotId: s.id,
                position: s.position,
                productId: s.productId,
                name: s.name,
                hint: s.hint,
                variantLabels: s.variantLabels,
                attachedAt: s.attachedAt,
                files: s.files.map((f) => ({
                  url: f.url,
                  variantLabel: f.variantLabel,
                  variationSku: f.variationSku,
                })),
                product: s.product
                  ? {
                      id: s.product.id,
                      name: s.product.name,
                      slug: s.product.slug,
                      price: s.product.price,
                    }
                  : null,
                fileCount: s.files.length,
              })),
              totalImages: items.length,
              ...(items.length >= 24 ? { truncated: true, note: "Showing first 24 images" } : {}),
            }),
          });

          if (d.includeImages) {
            const thumbs = await Promise.all(
              items.map((item) => (item.isVideo ? null : resizeImageForMcp(item.url))),
            );
            // Add image blocks (skip videos, text only)
            for (const [i, item] of items.entries()) {
              const label = item.variantLabel ? `· variant ${item.variantLabel}` : "";
              const slotLabel = `Slot ${item.slotLabel}`;

              if (item.isVideo) {
                // Videos: text-only block with URL
                content.push({
                  type: "text",
                  text: `${slotLabel} ${label} — ${item.url} (video)`,
                });
              } else {
                // Images: try to fetch and resize
                const resized = thumbs[i];

                if (resized) {
                  // Add text label
                  content.push({
                    type: "text",
                    text: `${slotLabel} ${label} — ${item.url}`,
                  });

                  // Add image block
                  content.push({
                    type: "image",
                    data: resized.data,
                    mimeType: resized.mimeType,
                  } as unknown as McpToolResult["content"][0]);
                } else {
                  // Fallback to text-only if fetch/resize fails
                  content.push({
                    type: "text",
                    text: `${slotLabel} ${label} — ${item.url} (failed to fetch thumbnail)`,
                  });
                }
              }
            }
          }

      return { content };
      } catch (err) {
        return mcpError(err, "get_upload_session failed");
      }
    },
  );

  server.registerTool(
    "attach_upload_slot",
    {
      title: "Attach draft slot to product",
      description:
        "Move photos and variant labels from a draft upload slot onto an existing product. Creates variations from variantLabels at product price (stock 0). Appends uploaded files as ProductImages. Idempotent — re-running doesn't duplicate images or variations. Use after reviewing the upload with get_upload_session and creating the product.",
      inputSchema: AttachUploadSlotInputSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = AttachUploadSlotInputSchema.parse(args);

        await attachUploadSlot({
          sessionId: d.sessionId,
          slotId: d.slotId,
          productId: d.productId,
          actor: ctx.tokenName,
        });

        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Product",
          entityId: d.productId,
          summary: `Attached upload slot ${d.slotId} via attach_upload_slot`,
        });

        bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage, CACHE_TAGS.collections, CACHE_TAGS.bundles);

        return mcpJson({ success: true });
      } catch (err) {
        return mcpError(err, "attach_upload_slot failed");
      }
    },
  );

  server.registerTool(
    "cancel_upload_session",
    {
      title: "Cancel upload session",
      description: "Revoke an upload session by ID. The URL becomes unusable; existing uploads remain (not deleted).",
      inputSchema: CancelUploadSessionInputSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = CancelUploadSessionInputSchema.parse(args);

        await cancelUploadSession(d.id);

        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "UploadSession",
          entityId: d.id,
          summary: "Cancelled via cancel_upload_session",
        });

        return mcpJson({ success: true });
      } catch (err) {
        return mcpError(err, "cancel_upload_session failed");
      }
    },
  );

  server.registerTool(
    "list_upload_sessions",
    {
      title: "List upload sessions",
      description:
        "List recent upload sessions, newest first (id, mode, status, source, createdBy, slotCount, uploadCount, createdAt, expiresAt). Use it to find a session started outside this chat — e.g. a staff member ran /upload on the Telegram sales bot (source: telegram) — then call get_upload_session with its id. The upload URL itself is never retrievable after creation.",
      inputSchema: {
        source: z.enum(["mcp", "telegram"]).optional(),
        includeExpired: z.boolean().default(false),
        limit: z.number().int().positive().max(50).default(20),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const rows = await prisma.uploadSession.findMany({
          where: {
            ...(args.source ? { source: args.source } : {}),
            ...(args.includeExpired ? {} : { expiresAt: { gt: new Date() }, revokedAt: null }),
          },
          orderBy: { createdAt: "desc" },
          take: args.limit ?? 20,
          select: {
            id: true,
            mode: true,
            status: true,
            source: true,
            createdBy: true,
            uploadCount: true,
            createdAt: true,
            expiresAt: true,
            _count: { select: { slots: true } },
          },
        });
        return mcpJson({
          sessions: rows.map(({ _count, ...r }) => ({ ...r, slotCount: _count.slots })),
        });
      } catch (err) {
        return mcpError(err, "list_upload_sessions failed");
      }
    },
  );
}
