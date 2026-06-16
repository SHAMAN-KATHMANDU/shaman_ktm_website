// MCP tools for the Product module. Mirrors /api/sysuser/products — writes go
// through the same lib/cms/products service as the REST routes, then audit-log
// and bump the same cache tags. CRU only: no delete tool by design.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { ProductSchema } from "@/lib/validation/schemas";
import { createProduct, updateProduct } from "@/lib/cms/products";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerProductTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_products",
    {
      title: "List products",
      description:
        "List products (id, slug, name, sku, price, status, elements, tags). Optional case-insensitive name search via `q`. Use this to find product ids/slugs before referencing them elsewhere.",
      inputSchema: { q: z.string().optional() },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const q = args.q?.trim();
        const products = await prisma.product.findMany({
          orderBy: { name: "asc" },
          where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
          select: {
            id: true,
            slug: true,
            name: true,
            sku: true,
            thumbnailUrl: true,
            price: true,
            priceOnEnquiry: true,
            isFeatured: true,
            isNewRelease: true,
            elementSlugs: true,
            categoryId: true,
            tags: true,
            status: true,
          },
        });
        return mcpJson({ products });
      } catch (err) {
        return mcpError(err, "list_products failed");
      }
    },
  );

  server.registerTool(
    "get_product",
    {
      title: "Get product",
      description:
        "Fetch one product (full payload incl. images, variations, category) by id or slug. Call this before update_product.",
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
        const product = await prisma.product.findUnique({
          where: args.id ? { id: args.id } : { slug: args.slug! },
          include: {
            variations: true,
            images: { orderBy: { position: "asc" } },
            category: true,
          },
        });
        if (!product) {
          throw new CmsError(
            `No product with ${args.id ? `id "${args.id}"` : `slug "${args.slug}"`}.`,
            { statusCode: 404 },
          );
        }
        return mcpJson({ product });
      } catch (err) {
        return mcpError(err, "get_product failed");
      }
    },
  );

  server.registerTool(
    "create_product",
    {
      title: "Create product",
      description:
        "Create a product. Mirrors POST /api/sysuser/products. Price is an integer in whole NPR rupees. categoryId must come from list_categories; elementSlugs from the six elements. Defaults to status=published — pass status=draft to stage.",
      inputSchema: ProductSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = ProductSchema.parse(args);
        const product = await createProduct(d, ctx.actor);
        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "Product",
          entityId: product.id,
          summary: product.name,
        });
        bumpTags(CACHE_TAGS.products, CACHE_TAGS.homepage);
        return mcpJson({ product });
      } catch (err) {
        return mcpError(err, "create_product failed");
      }
    },
  );

  server.registerTool(
    "update_product",
    {
      title: "Update product",
      description:
        "Update a product by id with a FULL payload (same schema as create — images and variations are replaced wholesale). Call get_product first and send back every field.",
      inputSchema: { id: z.string(), ...ProductSchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { id, ...rest } = args;
        const d = ProductSchema.parse(rest);
        const product = await updateProduct(id, d, ctx.actor);
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Product",
          entityId: id,
          summary: product?.name ?? null,
        });
        bumpTags(
          CACHE_TAGS.products,
          CACHE_TAGS.homepage,
          CACHE_TAGS.collections,
          CACHE_TAGS.bundles,
        );
        return mcpJson({ product });
      } catch (err) {
        return mcpError(err, "update_product failed");
      }
    },
  );
}
