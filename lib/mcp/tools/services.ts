// MCP tools for the Service module. Mirrors /api/sysuser/services — writes go
// through Prisma with audit logging and cache tag bumps. Includes validation
// for relatedProductSlugs (must be existing product slugs). CRU only: no delete
// tool by design.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { ServiceSchema } from "@/lib/validation/schemas";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerServiceTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_services",
    {
      title: "List services",
      description:
        "List all services (slug, name, element, pricePerSession, position). Ordered by position then name. Use this to find service slugs before referencing them elsewhere.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const services = await prisma.service.findMany({
          orderBy: [{ position: "asc" }, { name: "asc" }],
          select: {
            slug: true,
            name: true,
            nameNe: true,
            duration: true,
            durationNe: true,
            summary: true,
            summaryNe: true,
            seoTitle: true,
            seoTitleNe: true,
            seoDescription: true,
            seoDescriptionNe: true,
            element: true,
            pricePerSession: true,
            position: true,
          },
        });
        return mcpJson({ services });
      } catch (err) {
        return mcpError(err, "list_services failed");
      }
    },
  );

  server.registerTool(
    "get_service",
    {
      title: "Get service",
      description:
        "Fetch one service (full payload incl. whatToExpect, relatedProductSlugs, SEO fields) by slug. Call this before update_service.",
      inputSchema: { slug: z.string() },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const service = await prisma.service.findUnique({
          where: { slug: args.slug },
        });
        if (!service) {
          throw new CmsError(`No service with slug "${args.slug}".`, {
            statusCode: 404,
          });
        }
        return mcpJson({ service });
      } catch (err) {
        return mcpError(err, "get_service failed");
      }
    },
  );

  server.registerTool(
    "create_service",
    {
      title: "Create service",
      description:
        "Create a service. Slug must be lower-kebab-case. Element is one of: metal, earth, wood, plant, water, air. pricePerSession is an integer in whole NPR rupees. relatedProductSlugs must reference existing products; pass empty array if none. Includes SEO fields.",
      inputSchema: ServiceSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = ServiceSchema.parse(args);

        const relatedSlugs = d.relatedProductSlugs ?? [];
        if (relatedSlugs.length > 0) {
          const found = await prisma.product.findMany({
            where: { slug: { in: relatedSlugs } },
            select: { slug: true },
          });
          const missing = relatedSlugs.filter(
            (s) => !found.some((f) => f.slug === s),
          );
          if (missing.length > 0) {
            const allProducts = await prisma.product.findMany({
              select: { slug: true, name: true },
              orderBy: { name: "asc" },
            });
            const availableOptions = allProducts.map(
              (p) => `${p.slug} (${p.name})`,
            );
            throw new CmsError(
              `Unknown related product slugs: ${missing.join(", ")}`,
              {
                statusCode: 400,
                referenceKind: "Product",
                availableOptions,
              },
            );
          }
        }

        const service = await prisma.service.create({
          data: {
            slug: d.slug,
            name: d.name,
            nameNe: d.nameNe ?? null,
            element: d.element,
            duration: d.duration,
            durationNe: d.durationNe ?? null,
            pricePerSession: d.pricePerSession,
            hero: d.hero ?? null,
            summary: d.summary,
            summaryNe: d.summaryNe ?? null,
            whatToExpect: d.whatToExpect,
            whatToExpectNe: d.whatToExpectNe ?? undefined,
            relatedProductSlugs: d.relatedProductSlugs,
            position: d.position,
            seoTitle: d.seoTitle ?? null,
            seoTitleNe: d.seoTitleNe ?? null,
            seoDescription: d.seoDescription ?? null,
            seoDescriptionNe: d.seoDescriptionNe ?? null,
            ogImageUrl: d.ogImageUrl || null,
            canonicalUrl: d.canonicalUrl || null,
            noindex: d.noindex ?? false,
            twitterCard: d.twitterCard ?? "summary_large_image",
          },
        });
        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "Service",
          entityId: service.slug,
          summary: service.name,
        });
        bumpTags(CACHE_TAGS.services);
        return mcpJson({ service });
      } catch (err) {
        return mcpError(err, "create_service failed");
      }
    },
  );

  server.registerTool(
    "update_service",
    {
      title: "Update service",
      description:
        "Update a service with a FULL payload (same schema as create). `currentSlug` identifies the service; the payload's `slug` may differ to rename it. Call get_service first and send back every field. Validates relatedProductSlugs against existing products.",
      inputSchema: { currentSlug: z.string(), ...ServiceSchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { currentSlug, ...rest } = args;
        const d = ServiceSchema.parse(rest);

        const relatedSlugs = d.relatedProductSlugs ?? [];
        if (relatedSlugs.length > 0) {
          const found = await prisma.product.findMany({
            where: { slug: { in: relatedSlugs } },
            select: { slug: true },
          });
          const missing = relatedSlugs.filter(
            (s) => !found.some((f) => f.slug === s),
          );
          if (missing.length > 0) {
            const allProducts = await prisma.product.findMany({
              select: { slug: true, name: true },
              orderBy: { name: "asc" },
            });
            const availableOptions = allProducts.map(
              (p) => `${p.slug} (${p.name})`,
            );
            throw new CmsError(
              `Unknown related product slugs: ${missing.join(", ")}`,
              {
                statusCode: 400,
                referenceKind: "Product",
                availableOptions,
              },
            );
          }
        }

        const service = await prisma.service.update({
          where: { slug: currentSlug },
          data: {
            slug: d.slug,
            name: d.name,
            nameNe: d.nameNe ?? null,
            element: d.element,
            duration: d.duration,
            durationNe: d.durationNe ?? null,
            pricePerSession: d.pricePerSession,
            hero: d.hero ?? null,
            summary: d.summary,
            summaryNe: d.summaryNe ?? null,
            whatToExpect: d.whatToExpect,
            whatToExpectNe: d.whatToExpectNe ?? undefined,
            relatedProductSlugs: d.relatedProductSlugs,
            position: d.position,
            seoTitle: d.seoTitle ?? null,
            seoTitleNe: d.seoTitleNe ?? null,
            seoDescription: d.seoDescription ?? null,
            seoDescriptionNe: d.seoDescriptionNe ?? null,
            ogImageUrl: d.ogImageUrl || null,
            canonicalUrl: d.canonicalUrl || null,
            noindex: d.noindex ?? false,
            twitterCard: d.twitterCard ?? "summary_large_image",
          },
        });
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Service",
          entityId: service.slug,
          summary: service.name,
        });
        bumpTags(CACHE_TAGS.services);
        return mcpJson({ service });
      } catch (err) {
        return mcpError(err, "update_service failed");
      }
    },
  );
}
