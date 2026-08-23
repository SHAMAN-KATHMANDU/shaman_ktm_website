// MCP tools for the Media module. Mirrors /api/sysuser/media/* — both read
// and write operations call lib/cms/media service functions, then audit-log
// with the same action values as the REST routes.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  MediaSignRequest,
  UploadMediaRequest,
  AddProductImagesRequest,
  RemoveProductImageRequest,
  ReorderProductImagesRequest,
  SetEntityImageRequest,
  ENTITY_IMAGE_TARGETS,
} from "@/lib/validation/schemas";
import {
  signMediaUpload,
  confirmMediaUpload,
  updateMediaMetadata,
  uploadMediaFromInput,
} from "@/lib/cms/media";
import {
  addProductImages,
  removeProductImage,
  reorderProductImages,
  setEntityImage,
} from "@/lib/cms/media-attach";
import { MAX_BASE64_BYTES, MAX_FETCH_BYTES } from "@/lib/cms/media-guards";
import { logAction } from "@/lib/audit";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";
import { objectHead } from "@/lib/s3";

const MB = 1024 * 1024;

export function registerMediaTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "upload_media",
    {
      title: "Upload media (one call)",
      description: [
        "Upload a photo/video to the media library in ONE call — no HTTP PUT needed. Pass exactly one of:",
        `- sourceUrl: a public https:// link to the file (≤ ${MAX_FETCH_BYTES / MB} MB, 20 s). Google Drive share links work if the file is shared as "anyone with the link" (docs/photos share links, private files and login pages are rejected). Do NOT pass Telegram file URLs containing a bot token — read the file and use base64 instead.`,
        `- base64: the file bytes as base64 (raw or data: URL), ≤ ${MAX_BASE64_BYTES / MB} MB decoded; contentType is then required (image/jpeg, image/png, image/webp, image/avif, image/gif, video/mp4, video/webm, video/quicktime). Use this from agents that hold the file locally (Telegram bots, scripts).`,
        "Optional: filename (used to build the S3 key), alt (accessibility text). Files are stored as-is (no resizing); images are sniffed for real type + width/height, so a mislabelled file is stored under its true type or rejected.",
        "Returns {media:{id,url,mime,bytes,width,height,alt}} — use media.url in add_product_images / set_entity_image / product images / heroImageUrl etc. For files above the caps use sign_media_upload + HTTP PUT + confirm_media_upload.",
      ].join("\n"),
      inputSchema: UploadMediaRequest.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = UploadMediaRequest.parse(args);
        const { row, isNew } = await uploadMediaFromInput(d);
        logAction({
          actor: ctx.actor,
          action: isNew ? "upload" : "update",
          entity: "Media",
          entityId: row.id,
          summary: `${row.key} (${row.mime}, ${row.bytes} bytes) via ${d.sourceUrl ? "url" : "base64"}`,
        });
        return mcpJson({ media: row });
      } catch (err) {
        return mcpError(err, "upload_media failed");
      }
    },
  );

  server.registerTool(
    "add_product_images",
    {
      title: "Add product images",
      description:
        "Append one or more images to a product WITHOUT resending the full product (unlike update_product, which replaces images wholesale). Each image: {url (from upload_media / list_media), alt?, altNe?, variationSku?}. Pass variationSku to attach the photo to ONE variation (get the SKU from get_product's variations list); omit it or pass null for a product-gallery photo, which is how images behaved before per-variation photos existed. An unknown variationSku is rejected with the product's valid SKUs in availableOptions. Positions continue after the current last image. setThumbnail=true makes the first new image the product thumbnail; when the product has no thumbnail yet it is set automatically. Returns the product with images ordered by position, each carrying its variationId.",
      inputSchema: AddProductImagesRequest.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = AddProductImagesRequest.parse(args);
        const product = await addProductImages(d.productId, d.images, {
          setThumbnail: d.setThumbnail,
        });
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Product",
          entityId: d.productId,
          summary: `+${d.images.length} image(s) via add_product_images`,
        });
        bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage, CACHE_TAGS.collections, CACHE_TAGS.bundles);
        return mcpJson({ product });
      } catch (err) {
        return mcpError(err, "add_product_images failed");
      }
    },
  );

  server.registerTool(
    "remove_product_image",
    {
      title: "Remove product image",
      description:
        "Remove one image from a product's gallery by ProductImage id or exact url (get_product lists both). Remaining images are renumbered; if the removed image was the thumbnail, the next image becomes the thumbnail. Does not delete the file from the media library.",
      inputSchema: RemoveProductImageRequest.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = RemoveProductImageRequest.parse(args);
        const product = await removeProductImage(d.productId, {
          imageId: d.imageId,
          url: d.url,
        });
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Product",
          entityId: d.productId,
          summary: `-1 image (${d.imageId ?? d.url}) via remove_product_image`,
        });
        bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage, CACHE_TAGS.collections, CACHE_TAGS.bundles);
        return mcpJson({ product });
      } catch (err) {
        return mcpError(err, "remove_product_image failed");
      }
    },
  );

  server.registerTool(
    "reorder_product_images",
    {
      title: "Reorder product images",
      description:
        "Set the exact gallery order of a product. imageIds must list EVERY current image exactly once (ProductImage ids or urls, from get_product); position 0 is first. Errors include availableOptions with the current ids/urls.",
      inputSchema: ReorderProductImagesRequest.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = ReorderProductImagesRequest.parse(args);
        const product = await reorderProductImages(d.productId, d.imageIds);
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Product",
          entityId: d.productId,
          summary: `reordered ${d.imageIds.length} images`,
        });
        bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage, CACHE_TAGS.collections);
        return mcpJson({ product });
      } catch (err) {
        return mcpError(err, "reorder_product_images failed");
      }
    },
  );

  server.registerTool(
    "set_entity_image",
    {
      title: "Set entity image field",
      description: `Set (or clear with url=null) a single image URL field on an entity without resending the whole object. target is one of: ${ENTITY_IMAGE_TARGETS.join(", ")}. entityId is the id (categories/products/bundles/collections/blog posts also accept slug; pages/services take slug). Use the url returned by upload_media or list_media.`,
      inputSchema: SetEntityImageRequest.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = SetEntityImageRequest.parse(args);
        const { row, tags, model, field } = await setEntityImage(
          d.target,
          d.entityId,
          d.url,
        );
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: model,
          entityId: d.entityId,
          summary: `${field} = ${d.url ?? "null"} via set_entity_image`,
        });
        bumpTags(...tags);
        return mcpJson({ [model.charAt(0).toLowerCase() + model.slice(1)]: row });
      } catch (err) {
        return mcpError(err, "set_entity_image failed");
      }
    },
  );

  server.registerTool(
    "list_media",
    {
      title: "List media",
      description:
        "List uploaded media (id, key, url, mime, bytes, width, height, alt). Optional case-insensitive search via `q`, filter by mime type prefix (e.g. 'image/', 'video/'), and pagination. Use this to find media ids before referencing them elsewhere.",
      inputSchema: {
        q: z.string().optional(),
        mime: z.string().optional(),
        page: z.number().int().positive().default(1),
        pageSize: z.number().int().positive().max(200).default(50),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const q = args.q?.trim();
        const mime = args.mime?.trim();
        const page = Math.max(1, args.page || 1);
        const pageSize = Math.min(200, Math.max(1, args.pageSize || 50));

        const where: Prisma.MediaWhereInput = {};
        if (q) {
          where.OR = [
            { key: { contains: q, mode: "insensitive" } },
            { url: { contains: q, mode: "insensitive" } },
            { alt: { contains: q, mode: "insensitive" } },
          ];
        }
        if (mime) {
          where.mime = { startsWith: mime };
        }

        const [rows, total] = await Promise.all([
          prisma.media.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          prisma.media.count({ where }),
        ]);

        return mcpJson({ media: rows, meta: { total, page, pageSize } });
      } catch (err) {
        return mcpError(err, "list_media failed");
      }
    },
  );

  server.registerTool(
    "sign_media_upload",
    {
      title: "Sign media upload",
      description:
        "Two-phase upload for HTTP-capable clients and files above upload_media's caps (large videos). Prefer upload_media if you cannot perform an HTTP PUT yourself. Phase 1: returns uploadUrl + key; (2) PUT the raw file bytes to uploadUrl with the same Content-Type; (3) call confirm_media_upload with the key. uploadUrl is valid for 5 minutes.",
      inputSchema: MediaSignRequest.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = MediaSignRequest.parse(args);
        const { uploadUrl, publicUrl, key } = await signMediaUpload(d);
        return mcpJson({ uploadUrl, publicUrl, key });
      } catch (err) {
        return mcpError(err, "sign_media_upload failed");
      }
    },
  );

  server.registerTool(
    "confirm_media_upload",
    {
      title: "Confirm media upload",
      description:
        "Phase 2 of the two-phase flow: confirm that the PUT to uploadUrl succeeded and create/update the Media row. Throws 422 if the object is not in S3 (CORS/signature issue); in that case retry with sign_media_upload — or use upload_media, which needs no PUT.",
      inputSchema: {
        key: z.string().min(1).max(500),
        width: z.number().int().positive().nullable().optional(),
        height: z.number().int().positive().nullable().optional(),
        alt: z.string().max(500).nullable().optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { row, isNew } = await confirmMediaUpload(args);
        const head = await objectHead(args.key);
        logAction({
          actor: ctx.actor,
          action: isNew ? "upload" : "update",
          entity: "Media",
          entityId: row.id,
          summary: `${args.key} (${head?.mime}, ${head?.bytes} bytes)`,
        });
        return mcpJson({ media: row });
      } catch (err) {
        return mcpError(err, "confirm_media_upload failed");
      }
    },
  );

  server.registerTool(
    "update_media",
    {
      title: "Update media",
      description:
        "Update media metadata (alt, width, height) by id. Mirrors PUT /api/sysuser/media/[id].",
      inputSchema: {
        id: z.string(),
        alt: z.string().max(500).nullable().optional(),
        width: z.number().int().positive().nullable().optional(),
        height: z.number().int().positive().nullable().optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { id, ...rest } = args;
        const updated = await updateMediaMetadata(id, rest);
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Media",
          entityId: id,
          summary: rest.alt ? `alt="${rest.alt}"` : "metadata",
        });
        return mcpJson({ media: updated });
      } catch (err) {
        return mcpError(err, "update_media failed");
      }
    },
  );
}
