// MCP tools for the Showroom module. Mirrors /api/sysuser/showrooms — direct
// Prisma calls, then audit-log and bump CACHE_TAGS.showrooms on every write.
// Showroom.key is the primary identifier (not auto-generated). CRU only: no
// delete tool by design.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { ShowroomSchema } from "@/lib/validation/schemas";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerShowroomTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_showrooms",
    {
      title: "List showrooms",
      description:
        "List all showrooms (key, name, address, whatsapp, mapEmbedUrl, position). Ordered by position then name.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const showrooms = await prisma.showroom.findMany({
          orderBy: [{ position: "asc" }, { name: "asc" }],
        });
        return mcpJson({ showrooms });
      } catch (err) {
        return mcpError(err, "list_showrooms failed");
      }
    },
  );

  server.registerTool(
    "create_showroom",
    {
      title: "Create showroom",
      description:
        "Create a showroom. key is a unique identifier (e.g., 'kathmandu-main'). Position defaults to 0. mapEmbedUrl is optional.",
      inputSchema: ShowroomSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = ShowroomSchema.parse(args);
        const showroom = await prisma.showroom.create({
          data: {
            key: d.key,
            name: d.name,
            nameNe: d.nameNe ?? null,
            address: d.address,
            addressNe: d.addressNe ?? null,
            whatsapp: d.whatsapp,
            mapEmbedUrl: d.mapEmbedUrl ?? null,
            position: d.position,
          },
        });
        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "Showroom",
          entityId: showroom.key,
          summary: showroom.name,
        });
        bumpTags(CACHE_TAGS.showrooms);
        return mcpJson({ showroom });
      } catch (err) {
        return mcpError(err, "create_showroom failed");
      }
    },
  );

  server.registerTool(
    "update_showroom",
    {
      title: "Update showroom",
      description:
        "Update a showroom with a FULL payload (same schema as create). `currentKey` identifies the showroom; the payload's `key` may differ to rename it. Call list_showrooms first to find the key.",
      inputSchema: { currentKey: z.string().min(1), ...ShowroomSchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { currentKey, ...rest } = args;
        const d = ShowroomSchema.parse(rest);
        const showroom = await prisma.showroom.update({
          where: { key: currentKey },
          data: {
            key: d.key,
            name: d.name,
            nameNe: d.nameNe ?? null,
            address: d.address,
            addressNe: d.addressNe ?? null,
            whatsapp: d.whatsapp,
            mapEmbedUrl: d.mapEmbedUrl ?? null,
            position: d.position,
          },
        });
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Showroom",
          entityId: showroom.key,
          summary: showroom.name,
        });
        bumpTags(CACHE_TAGS.showrooms);
        return mcpJson({ showroom });
      } catch (err) {
        return mcpError(err, "update_showroom failed");
      }
    },
  );
}
