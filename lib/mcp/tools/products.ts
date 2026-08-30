// MCP tools for the Product module. Mirrors /api/sysuser/products — writes go
// through the same lib/cms/products service as the REST routes, then audit-log
// and bump the same cache tags. CRU only: no delete tool by design.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import {
  ProductSchema,
  ProductUpdateSchema,
} from "@/lib/validation/schemas";
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
        "List products (id, slug, name, sku, price, stockQuantity, status, elements, tags, plus wholesale flags). Optional case-insensitive name search via `q`. Use this to find product ids/slugs before referencing them elsewhere. `legacyImsCode`, `wholesaleEnabled`, `wholesalePrice` and `moq` are admin-only fields — never surface wholesalePrice publicly (the storefront's /wholesale section shows MOQ and an Enquire CTA instead).",
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
            stockQuantity: true,
            elementSlugs: true,
            categoryId: true,
            tags: true,
            status: true,
            legacyImsCode: true,
            wholesaleEnabled: true,
            wholesalePrice: true,
            moq: true,
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
        "Fetch one product (full payload incl. images, variations, category) by id or slug. Call this before update_product. Each image carries `variationId` — null for a product-gallery photo, otherwise the id of the variation it belongs to; match it against the `variations` list, which carries both `id` and `sku`. Use those SKUs when writing images back: the payload references variations by `variationSku`, never by id.",
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
        "Create a product. Mirrors POST /api/sysuser/products. Price is an integer in whole NPR rupees. categoryId must come from list_categories; elementSlugs from the six elements. Defaults to status=published — pass status=draft to stage. `stockQuantity` is product-level stock (omit/null = untracked, always available); products with `variations` track stock per-variation instead, and once the per-showroom ledger has movements a variation's `stock` is materialized from it (see list_stock). `dimensions` is an optional object { length?, width?, height?, diameter?, weight?, unit: 'cm'|'in', weightUnit: 'g'|'kg', note? } — measurements may be decimals. Wholesale/reporting fields: `legacyImsCode` (historical IMS join key, unique), `qrPayload` (one QR per product, unique), `wholesaleEnabled` (include in the public /wholesale catalog), `wholesalePrice` (base trade rate, NPR — ADMIN ONLY, never shown publicly), `moq` (minimum order qty, shown publicly in /wholesale). Variations also accept label/color/size/dimensions/mrp plus admin-only costPrice/wholesalePrice and an `active` flag. An image may carry `variationSku` to attach it to one of this product's variations (the SKU is resolved after the variations are created, so a variation defined in this same call works); omit it or pass null for a product-gallery photo.",
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
        "Update a product by id. Call get_product first and send back every field you want kept. PRODUCT-LEVEL `stockQuantity`, `dimensions`, `wholesalePrice` and `moq` are TRI-STATE: omit to PRESERVE, pass null to clear, or pass a value to set. Images are still replaced wholesale. VARIATION fields are also TRI-STATE: for an existing variation (matched by SKU), omitting `attributes`, `label`, `color`, `size`, `dimensions`, `mrp`, `costPrice`, `wholesalePrice` or `active` PRESERVES its current value — pass null to clear one explicitly, or a value to set it. `price` is required. Send the same SKU to update a variation in place (its id, and therefore its stock ledger, is preserved), a new SKU to add one. A variation you omit ENTIRELY is deleted only if it has no stock history — if it does, it is retired (active=false) so the append-only ledger stays intact, and it stays retired unless you explicitly send `active: true`. A variation's `stock` is not writable once the per-showroom ledger owns it.",
      inputSchema: { id: z.string(), ...ProductUpdateSchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { id, ...rest } = args;
        const d = ProductUpdateSchema.parse(rest);
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
