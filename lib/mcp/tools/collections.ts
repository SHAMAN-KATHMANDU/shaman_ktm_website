// MCP tools for the Collection module. Mirrors /api/sysuser/collections — writes go
// through the same lib/cms/collections service as the REST routes, then audit-log
// and bump the same cache tags. CRU only: no delete tool by design.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { CollectionSchema } from "@/lib/validation/schemas";
import { createCollection, updateCollection } from "@/lib/cms/collections";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerCollectionTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_collections",
    {
      title: "List collections",
      description:
        "List collections (id, slug, title, position, product count). Use this to find collection ids/slugs before referencing them elsewhere.",
      inputSchema: { q: z.string().optional() },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const q = args.q?.trim();
        const collections = await prisma.collection.findMany({
          orderBy: [{ position: "asc" }, { title: "asc" }],
          where: q ? { title: { contains: q, mode: "insensitive" } } : undefined,
          select: {
            id: true,
            slug: true,
            title: true,
            position: true,
            _count: { select: { products: true } },
          },
        });
        return mcpJson({
          collections: collections.map((c) => ({
            id: c.id,
            slug: c.slug,
            title: c.title,
            position: c.position,
            productCount: c._count.products,
          })),
        });
      } catch (err) {
        return mcpError(err, "list_collections failed");
      }
    },
  );

  server.registerTool(
    "get_collection",
    {
      title: "Get collection",
      description:
        "Fetch one collection (full payload incl. products with details) by id or slug. Call this before update_collection.",
      inputSchema: {
        id: z.string().optional(),
        slug: z.string().optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        if (!args.id && !args.slug) {
          throw new CmsError("Pass `id` or `slug`.");
        }
        const collection = await prisma.collection.findUnique({
          where: args.id ? { id: args.id } : { slug: args.slug! },
          include: {
            products: {
              orderBy: { position: "asc" },
              include: {
                product: { select: { id: true, name: true, thumbnailUrl: true } },
              },
            },
          },
        });
        if (!collection) {
          throw new CmsError(
            `No collection with ${args.id ? `id "${args.id}"` : `slug "${args.slug}"`}.`,
            { statusCode: 404 },
          );
        }
        return mcpJson({ collection });
      } catch (err) {
        return mcpError(err, "get_collection failed");
      }
    },
  );

  server.registerTool(
    "create_collection",
    {
      title: "Create collection",
      description:
        "Create a collection. Mirrors POST /api/sysuser/collections. All productIds must exist — use list_products to find valid ids. Slug must be unique and lower-kebab-case.",
      inputSchema: CollectionSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = CollectionSchema.parse(args);
        const collection = await createCollection(d);
        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "Collection",
          entityId: collection.id,
          summary: collection.title,
        });
        bumpTags(CACHE_TAGS.collections);
        return mcpJson({ collection });
      } catch (err) {
        return mcpError(err, "create_collection failed");
      }
    },
  );

  server.registerTool(
    "update_collection",
    {
      title: "Update collection",
      description:
        "Update a collection by id with a FULL payload (same schema as create — products are replaced wholesale). Call get_collection first and send back every field.",
      inputSchema: { id: z.string(), ...CollectionSchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { id, ...rest } = args;
        const d = CollectionSchema.parse(rest);
        const collection = await updateCollection(id, d);
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Collection",
          entityId: id,
          summary: collection?.title ?? null,
        });
        bumpTags(CACHE_TAGS.collections);
        return mcpJson({ collection });
      } catch (err) {
        return mcpError(err, "update_collection failed");
      }
    },
  );
}
