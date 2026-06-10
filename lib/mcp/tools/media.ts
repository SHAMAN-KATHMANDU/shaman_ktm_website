// MCP tools for the Media module. Mirrors /api/sysuser/media/* — both read
// and write operations call lib/cms/media service functions, then audit-log
// with the same action values as the REST routes.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { MediaSignRequest } from "@/lib/validation/schemas";
import {
  signMediaUpload,
  confirmMediaUpload,
  updateMediaMetadata,
} from "@/lib/cms/media";
import { logAction } from "@/lib/audit";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";
import { objectHead } from "@/lib/s3";

export function registerMediaTools(server: McpServer, ctx: McpContext) {
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
        "Generate a presigned PUT URL for direct browser → S3 upload. Phase 1 of two-phase flow: (1) call this tool to get uploadUrl and key, (2) browser PUTs file bytes to uploadUrl, (3) call confirm_media_upload with the key to finish. The uploadUrl is valid for 5 minutes.",
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
        "Confirm that a presigned upload succeeded and create/update the Media row. Call this after the browser PUT to uploadUrl completes. Throws 422 if the object is not in S3 (CORS/signature issue); in that case, retry with sign_media_upload.",
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
