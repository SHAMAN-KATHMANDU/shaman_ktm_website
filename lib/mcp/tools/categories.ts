// MCP tools for the Category module. Mirrors /api/sysuser/categories — direct
// Prisma calls, then audit-log and bump the same cache tags as the REST routes.
// CRU only: no delete tool by design.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { CategorySchema } from "@/lib/validation/schemas";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerCategoryTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_categories",
    {
      title: "List categories",
      description:
        "List all categories with product count (id, slug, name, imageUrl, position, _count.products). Ordered by position then name.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const categories = await prisma.category.findMany({
          orderBy: [{ position: "asc" }, { name: "asc" }],
          include: { _count: { select: { products: true } } },
        });
        return mcpJson({ categories });
      } catch (err) {
        return mcpError(err, "list_categories failed");
      }
    },
  );

  server.registerTool(
    "create_category",
    {
      title: "Create category",
      description:
        "Create a category. Slug must be unique, lower-kebab-case. imageUrl is optional. position defaults to 0 (for ordering in UI).",
      inputSchema: CategorySchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = CategorySchema.parse(args);
        const category = await prisma.category.create({
          data: {
            slug: d.slug,
            name: d.name,
            imageUrl: d.imageUrl ?? null,
            position: d.position,
          },
        });
        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "Category",
          entityId: category.id,
          summary: category.name,
        });
        bumpTags(CACHE_TAGS.categories);
        return mcpJson({ category });
      } catch (err) {
        return mcpError(err, "create_category failed");
      }
    },
  );

  server.registerTool(
    "update_category",
    {
      title: "Update category",
      description:
        "Update a category by id with a full payload (same schema as create). Call list_categories first to find the id.",
      inputSchema: { id: z.string(), ...CategorySchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { id, ...rest } = args;
        const d = CategorySchema.parse(rest);
        const category = await prisma.category.update({
          where: { id },
          data: {
            slug: d.slug,
            name: d.name,
            imageUrl: d.imageUrl ?? null,
            position: d.position,
          },
        });
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Category",
          entityId: id,
          summary: category.name,
        });
        bumpTags(CACHE_TAGS.categories, CACHE_TAGS.products);
        return mcpJson({ category });
      } catch (err) {
        return mcpError(err, "update_category failed");
      }
    },
  );
}
