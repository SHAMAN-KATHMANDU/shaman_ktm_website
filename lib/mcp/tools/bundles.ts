// MCP tools for the Bundle module. Mirrors /api/sysuser/bundles — writes go
// through the same lib/cms/bundles service as the REST routes, then audit-log
// and bump the same cache tags. CRU only: no delete tool by design.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { BundleSchema } from "@/lib/validation/schemas";
import { createBundle, updateBundle } from "@/lib/cms/bundles";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerBundleTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_bundles",
    {
      title: "List bundles",
      description:
        "List bundles (id, slug, title, price, position, item count). Use this to find bundle ids/slugs before referencing them elsewhere.",
      inputSchema: { q: z.string().optional() },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const q = args.q?.trim();
        const bundles = await prisma.bundle.findMany({
          orderBy: [{ position: "asc" }, { title: "asc" }],
          where: q ? { title: { contains: q, mode: "insensitive" } } : undefined,
          select: {
            id: true,
            slug: true,
            title: true,
            price: true,
            position: true,
            _count: { select: { items: true } },
          },
        });
        return mcpJson({
          bundles: bundles.map((b) => ({
            id: b.id,
            slug: b.slug,
            title: b.title,
            price: b.price,
            position: b.position,
            itemCount: b._count.items,
          })),
        });
      } catch (err) {
        return mcpError(err, "list_bundles failed");
      }
    },
  );

  server.registerTool(
    "get_bundle",
    {
      title: "Get bundle",
      description:
        "Fetch one bundle (full payload incl. items with product details) by id or slug. Call this before update_bundle.",
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
        const bundle = await prisma.bundle.findUnique({
          where: args.id ? { id: args.id } : { slug: args.slug! },
          include: {
            items: {
              orderBy: { position: "asc" },
              include: {
                product: { select: { id: true, name: true, thumbnailUrl: true } },
              },
            },
          },
        });
        if (!bundle) {
          throw new CmsError(
            `No bundle with ${args.id ? `id "${args.id}"` : `slug "${args.slug}"`}.`,
            { statusCode: 404 },
          );
        }
        return mcpJson({ bundle });
      } catch (err) {
        return mcpError(err, "get_bundle failed");
      }
    },
  );

  server.registerTool(
    "create_bundle",
    {
      title: "Create bundle",
      description:
        "Create a bundle. Mirrors POST /api/sysuser/bundles. Price is in NPR paisa. All items[].productId must exist — use list_products to find valid ids.",
      inputSchema: BundleSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = BundleSchema.parse(args);
        const bundle = await createBundle(d);
        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "Bundle",
          entityId: bundle.id,
          summary: bundle.title,
        });
        bumpTags(CACHE_TAGS.bundles);
        return mcpJson({ bundle });
      } catch (err) {
        return mcpError(err, "create_bundle failed");
      }
    },
  );

  server.registerTool(
    "update_bundle",
    {
      title: "Update bundle",
      description:
        "Update a bundle by id with a FULL payload (same schema as create — items are replaced wholesale). Call get_bundle first and send back every field.",
      inputSchema: { id: z.string(), ...BundleSchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { id, ...rest } = args;
        const d = BundleSchema.parse(rest);
        const bundle = await updateBundle(id, d);
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Bundle",
          entityId: id,
          summary: bundle?.title ?? null,
        });
        bumpTags(CACHE_TAGS.bundles);
        return mcpJson({ bundle });
      } catch (err) {
        return mcpError(err, "update_bundle failed");
      }
    },
  );
}
