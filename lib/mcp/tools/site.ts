// MCP tools for site config singletons. Mirrors /api/sysuser/site*
// These entities (SiteConfig, HomepageConfig, Modules, Announcement) use upsert
// semantics (always return id=1). Tools must fetch the full object first, modify,
// and send back the entire payload since these are singletons.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import {
  SiteConfigSchema,
  HomepageConfigSchema,
  ModulesSchema,
  AnnouncementSchema,
} from "@/lib/validation/schemas";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerSiteConfigTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "get_site_config",
    {
      title: "Get site config",
      description:
        "Fetch the singleton site configuration (name, branding, contact, SEO, nav, theme tokens, locales, etc.). Call this before update_site_config.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
        const config = row?.data ?? null;
        return mcpJson({ config });
      } catch (err) {
        return mcpError(err, "get_site_config failed");
      }
    },
  );

  server.registerTool(
    "update_site_config",
    {
      title: "Update site config",
      description:
        "Update the singleton site configuration. WARNING: this is a site-wide setting — fetch with get_site_config first, modify the fields you need, and send back the FULL object. Includes branding (logo, colors), contact info, SEO defaults, nav config, locale settings, and WhatsApp templates.",
      inputSchema: SiteConfigSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = SiteConfigSchema.parse(args);
        const row = await prisma.siteConfig.upsert({
          where: { id: 1 },
          update: { data: d },
          create: { id: 1, data: d },
        });
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "SiteConfig",
        });
        bumpTags(CACHE_TAGS.site);
        return mcpJson({ config: row.data });
      } catch (err) {
        return mcpError(err, "update_site_config failed");
      }
    },
  );

  server.registerTool(
    "get_homepage_config",
    {
      title: "Get homepage config",
      description:
        "Fetch the singleton homepage configuration (hero image/video, featured product/post ids, element spotlights, services preview). Call this before update_homepage_config.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const row = await prisma.homepageConfig.findUnique({
          where: { id: 1 },
        });
        const config = row?.data ?? null;
        return mcpJson({ config });
      } catch (err) {
        return mcpError(err, "get_homepage_config failed");
      }
    },
  );

  server.registerTool(
    "update_homepage_config",
    {
      title: "Update homepage config",
      description:
        "Update the singleton homepage configuration. WARNING: this is a site-wide setting — fetch with get_homepage_config first, modify the fields you need, and send back the FULL object. Referenced product/post ids must exist or the update fails with availableOptions.",
      inputSchema: HomepageConfigSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = HomepageConfigSchema.parse(args);

        // Validate that referenced product ids exist
        if (d.newReleasesProductIds && d.newReleasesProductIds.length > 0) {
          const products = await prisma.product.findMany({
            where: { id: { in: d.newReleasesProductIds } },
            select: { id: true },
          });
          const foundIds = products.map((p) => p.id);
          const missing = d.newReleasesProductIds.filter(
            (id) => !foundIds.includes(id),
          );
          if (missing.length > 0) {
            const available = await prisma.product.findMany({
              orderBy: { name: "asc" },
              select: { id: true, name: true },
            });
            const options = available.map((p) => `${p.id} (${p.name})`);
            throw new CmsError(
              `Product ids not found: ${missing.join(", ")}.`,
              {
                statusCode: 404,
                referenceKind: "Product",
                availableOptions: options,
              },
            );
          }
        }

        // Validate that referenced post ids exist
        if (d.featuredPostIds && d.featuredPostIds.length > 0) {
          const posts = await prisma.blogPost.findMany({
            where: { id: { in: d.featuredPostIds } },
            select: { id: true },
          });
          const foundIds = posts.map((p) => p.id);
          const missing = d.featuredPostIds.filter(
            (id) => !foundIds.includes(id),
          );
          if (missing.length > 0) {
            const available = await prisma.blogPost.findMany({
              orderBy: { title: "asc" },
              select: { id: true, title: true },
            });
            const options = available.map((p) => `${p.id} (${p.title})`);
            throw new CmsError(`Post ids not found: ${missing.join(", ")}.`, {
              statusCode: 404,
              referenceKind: "BlogPost",
              availableOptions: options,
            });
          }
        }

        // Validate element spotlight products
        if (
          d.elementSpotlightProductIds &&
          Object.keys(d.elementSpotlightProductIds).length > 0
        ) {
          const allProductIds = Object.values(
            d.elementSpotlightProductIds,
          ).flat();
          if (allProductIds.length > 0) {
            const products = await prisma.product.findMany({
              where: { id: { in: allProductIds } },
              select: { id: true },
            });
            const foundIds = products.map((p) => p.id);
            const missing = allProductIds.filter(
              (id) => !foundIds.includes(id),
            );
            if (missing.length > 0) {
              const available = await prisma.product.findMany({
                orderBy: { name: "asc" },
                select: { id: true, name: true },
              });
              const options = available.map((p) => `${p.id} (${p.name})`);
              throw new CmsError(
                `Element spotlight product ids not found: ${missing.join(", ")}.`,
                {
                  statusCode: 404,
                  referenceKind: "Product",
                  availableOptions: options,
                },
              );
            }
          }
        }

        // Validate services preview slugs
        if (d.servicesPreviewSlugs && d.servicesPreviewSlugs.length > 0) {
          const services = await prisma.service.findMany({
            where: { slug: { in: d.servicesPreviewSlugs } },
            select: { slug: true },
          });
          const foundSlugs = services.map((s) => s.slug);
          const missing = d.servicesPreviewSlugs.filter(
            (slug) => !foundSlugs.includes(slug),
          );
          if (missing.length > 0) {
            const available = await prisma.service.findMany({
              orderBy: { name: "asc" },
              select: { slug: true, name: true },
            });
            const options = available.map((s) => `${s.slug} (${s.name})`);
            throw new CmsError(
              `Service slugs not found: ${missing.join(", ")}.`,
              {
                statusCode: 404,
                referenceKind: "Service",
                availableOptions: options,
              },
            );
          }
        }

        const row = await prisma.homepageConfig.upsert({
          where: { id: 1 },
          update: { data: d },
          create: { id: 1, data: d },
        });
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "HomepageConfig",
        });
        bumpTags(CACHE_TAGS.homepage, CACHE_TAGS.products, CACHE_TAGS.blog);
        return mcpJson({ config: row.data });
      } catch (err) {
        return mcpError(err, "update_homepage_config failed");
      }
    },
  );

  server.registerTool(
    "get_modules",
    {
      title: "Get modules",
      description:
        "Fetch the modules configuration (feature flags for homepage sections, blog, bundles, collections, services, reviews, cart, search, announcement bar, etc.). Call this before update_modules.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
        const stored =
          row?.data && typeof row.data === "object" && "modules" in row.data
            ? ((row.data as { modules?: Record<string, boolean> }).modules ?? {})
            : {};
        // Import DEFAULT_MODULES would require a circular dependency or moving
        // it, so we just return stored modules; the frontend will merge with
        // defaults on read.
        return mcpJson({ modules: stored });
      } catch (err) {
        return mcpError(err, "get_modules failed");
      }
    },
  );

  server.registerTool(
    "update_modules",
    {
      title: "Update modules",
      description:
        "Update the modules configuration (feature flags). Only pass the fields you want to change; unspecified fields retain their values. Examples: homeHero, homeBrandStrip, homeNewReleases, blogIndex, reviews, cart, announcementBar, etc.",
      inputSchema: ModulesSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = ModulesSchema.parse(args);

        const row = await prisma.siteConfig.findUnique({ where: { id: 1 } });
        const data = (row?.data as Record<string, unknown> | null) ?? {};
        const next = {
          ...data,
          modules: { ...(data.modules as object), ...d },
        };

        await prisma.siteConfig.upsert({
          where: { id: 1 },
          update: { data: next },
          create: { id: 1, data: next },
        });

        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Modules",
          summary: Object.keys(d).join(", "),
        });
        bumpTags(CACHE_TAGS.site);
        return mcpJson({ modules: next.modules });
      } catch (err) {
        return mcpError(err, "update_modules failed");
      }
    },
  );

  server.registerTool(
    "get_announcement",
    {
      title: "Get announcement",
      description:
        "Fetch the singleton announcement bar configuration (enabled, message, link, colors, dismissable). Call this before update_announcement.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const announcement = await prisma.announcement.findUnique({
          where: { id: 1 },
        });
        return mcpJson({ announcement: announcement ?? null });
      } catch (err) {
        return mcpError(err, "get_announcement failed");
      }
    },
  );

  server.registerTool(
    "update_announcement",
    {
      title: "Update announcement",
      description:
        "Update the singleton announcement bar. Fields: enabled (bool), message (string), href (optional link), bgColor/fgColor (hex), dismissable (bool). Defaults: bgColor=#c4a35a (gold), fgColor=#0a0806 (dark), dismissable=true.",
      inputSchema: AnnouncementSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = AnnouncementSchema.parse(args);
        const row = await prisma.announcement.upsert({
          where: { id: 1 },
          update: { ...d, messageNe: d.messageNe ?? null, href: d.href ?? null },
          create: { id: 1, ...d, messageNe: d.messageNe ?? null, href: d.href ?? null },
        });
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Announcement",
          summary: row.enabled ? "enabled" : "disabled",
        });
        bumpTags(CACHE_TAGS.site);
        return mcpJson({ announcement: row });
      } catch (err) {
        return mcpError(err, "update_announcement failed");
      }
    },
  );
}
