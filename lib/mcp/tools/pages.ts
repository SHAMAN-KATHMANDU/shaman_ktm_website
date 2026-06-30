// MCP tools for the Page module. Mirrors /api/sysuser/pages — writes go
// through Prisma with audit logging and cache tag bumps. CRU only: no delete
// tool by design.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { PageSchema } from "@/lib/validation/schemas";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerPageTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_pages",
    {
      title: "List pages",
      description:
        "List all pages (slug, title, publishedAt). Pages use slug (lower-kebab-case) as the primary key. Use this to find page slugs before referencing them elsewhere.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const pages = await prisma.page.findMany({
          orderBy: { slug: "asc" },
          select: {
            slug: true,
            title: true,
            titleNe: true,
            bodyMarkdown: true,
            bodyMarkdownNe: true,
            seoTitle: true,
            seoTitleNe: true,
            seoDescription: true,
            seoDescriptionNe: true,
            publishedAt: true,
          },
        });
        return mcpJson({ pages });
      } catch (err) {
        return mcpError(err, "list_pages failed");
      }
    },
  );

  server.registerTool(
    "get_page",
    {
      title: "Get page",
      description:
        "Fetch one page (full payload incl. body, SEO fields) by slug. Call this before update_page.",
      inputSchema: { slug: z.string() },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const page = await prisma.page.findUnique({
          where: { slug: args.slug },
        });
        if (!page) {
          throw new CmsError(`No page with slug "${args.slug}".`, {
            statusCode: 404,
          });
        }
        return mcpJson({ page });
      } catch (err) {
        return mcpError(err, "get_page failed");
      }
    },
  );

  server.registerTool(
    "create_page",
    {
      title: "Create page",
      description:
        "Create a page. Slug must be unique, lower-kebab-case. Includes SEO fields (seoTitle, seoDescription, ogImageUrl, canonicalUrl, noindex, twitterCard).",
      inputSchema: PageSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = PageSchema.parse(args);

        const slugClash = await prisma.page.findUnique({
          where: { slug: d.slug },
          select: { slug: true },
        });
        if (slugClash) {
          throw new CmsError(
            `A page with slug "${d.slug}" already exists.`,
            { statusCode: 409 },
          );
        }

        const page = await prisma.page.create({
          data: {
            slug: d.slug,
            title: d.title,
            titleNe: d.titleNe ?? null,
            bodyMarkdown: d.bodyMarkdown,
            bodyMarkdownNe: d.bodyMarkdownNe ?? null,
            publishedAt: d.publishedAt ? new Date(d.publishedAt) : new Date(),
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
          entity: "Page",
          entityId: page.slug,
          summary: page.title,
        });
        bumpTags(CACHE_TAGS.pages);
        return mcpJson({ page });
      } catch (err) {
        return mcpError(err, "create_page failed");
      }
    },
  );

  server.registerTool(
    "update_page",
    {
      title: "Update page",
      description:
        "Update a page with a FULL payload (same schema as create). `currentSlug` identifies the page; the payload's `slug` may differ to rename it. Call get_page first and send back every field.",
      inputSchema: { currentSlug: z.string(), ...PageSchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { currentSlug, ...rest } = args;
        const d = PageSchema.parse(rest);

        const page = await prisma.page.update({
          where: { slug: currentSlug },
          data: {
            slug: d.slug,
            title: d.title,
            titleNe: d.titleNe ?? null,
            bodyMarkdown: d.bodyMarkdown,
            bodyMarkdownNe: d.bodyMarkdownNe ?? null,
            publishedAt: d.publishedAt ? new Date(d.publishedAt) : undefined,
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
          entity: "Page",
          entityId: page.slug,
          summary: page.title,
        });
        bumpTags(CACHE_TAGS.pages);
        return mcpJson({ page });
      } catch (err) {
        return mcpError(err, "update_page failed");
      }
    },
  );
}
