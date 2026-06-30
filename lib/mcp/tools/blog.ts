// MCP tools for the Blog module. Mirrors /api/sysuser/blog/* — writes go
// through Prisma with the same data mappings as the REST routes, then audit-log
// and bump the same cache tags. CRU only: no delete tool by design.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import {
  BlogPostSchema,
  BlogCategorySchema,
} from "@/lib/validation/schemas";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerBlogTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_blog_posts",
    {
      title: "List blog posts",
      description:
        "List blog posts (id, slug, title, status, isFeatured, categorySlug, tags). Use to find post ids/slugs before referencing them elsewhere.",
      inputSchema: { q: z.string().optional() },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const q = args.q?.trim();
        const posts = await prisma.blogPost.findMany({
          orderBy: { updatedAt: "desc" },
          where: q ? { title: { contains: q, mode: "insensitive" } } : undefined,
          select: {
            id: true,
            slug: true,
            title: true,
            titleNe: true,
            excerpt: true,
            excerptNe: true,
            bodyMarkdown: true,
            bodyMarkdownNe: true,
            seoTitle: true,
            seoTitleNe: true,
            seoDescription: true,
            seoDescriptionNe: true,
            status: true,
            isFeatured: true,
            categorySlug: true,
            tags: true,
            updatedAt: true,
          },
        });
        return mcpJson({ posts });
      } catch (err) {
        return mcpError(err, "list_blog_posts failed");
      }
    },
  );

  server.registerTool(
    "get_blog_post",
    {
      title: "Get blog post",
      description:
        "Fetch one blog post (full payload incl. all fields, category) by id or slug. Call this before update_blog_post.",
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
        const post = await prisma.blogPost.findUnique({
          where: args.id ? { id: args.id } : { slug: args.slug! },
          include: { category: true },
        });
        if (!post) {
          throw new CmsError(
            `No blog post with ${args.id ? `id "${args.id}"` : `slug "${args.slug}"`}.`,
            { statusCode: 404 },
          );
        }
        return mcpJson({ post });
      } catch (err) {
        return mcpError(err, "get_blog_post failed");
      }
    },
  );

  server.registerTool(
    "create_blog_post",
    {
      title: "Create blog post",
      description:
        "Create a blog post. Mirrors POST /api/sysuser/blog/posts. categorySlug must be null or come from list_blog_categories (slug collision throws 409). Defaults to status=draft. Hero video embeds are normalized (YouTube/Vimeo only).",
      inputSchema: BlogPostSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = BlogPostSchema.parse(args);

        // Validate categorySlug if provided
        if (d.categorySlug) {
          const category = await prisma.blogCategory.findUnique({
            where: { slug: d.categorySlug },
            select: { slug: true },
          });
          if (!category) {
            const available = await prisma.blogCategory.findMany({
              select: { slug: true, name: true },
              orderBy: { name: "asc" },
            });
            throw new CmsError(
              `No blog category with slug "${d.categorySlug}".`,
              {
                statusCode: 400,
                referenceKind: "BlogCategory",
                availableOptions: available.map(
                  (c) => `${c.slug} (${c.name})`,
                ),
              },
            );
          }
        }

        // Check slug uniqueness
        const existing = await prisma.blogPost.findUnique({
          where: { slug: d.slug },
          select: { id: true },
        });
        if (existing) {
          throw new CmsError(`Slug "${d.slug}" is already taken.`, {
            statusCode: 409,
          });
        }

        const post = await prisma.blogPost.create({
          data: {
            slug: d.slug,
            title: d.title,
            titleNe: d.titleNe ?? null,
            excerpt: d.excerpt,
            excerptNe: d.excerptNe ?? null,
            bodyMarkdown: d.bodyMarkdown,
            bodyMarkdownNe: d.bodyMarkdownNe ?? null,
            heroImageUrl: d.heroImageUrl ?? null,
            heroVideoEmbedUrl: d.heroVideoEmbedUrl,
            authorName: d.authorName,
            categorySlug: d.categorySlug ?? null,
            tags: d.tags,
            isFeatured: d.isFeatured,
            status: d.status,
            publishedAt: d.publishedAt
              ? new Date(d.publishedAt)
              : d.status === "published"
                ? new Date()
                : null,
            readingMinutes: d.readingMinutes,
            seoTitle: d.seoTitle ?? null,
            seoTitleNe: d.seoTitleNe ?? null,
            seoDescription: d.seoDescription ?? null,
            seoDescriptionNe: d.seoDescriptionNe ?? null,
            ogImageUrl: d.ogImageUrl || null,
            canonicalUrl: d.canonicalUrl || null,
            noindex: d.noindex ?? false,
            twitterCard: d.twitterCard ?? "summary_large_image",
            lastEditedBy: ctx.actor,
          },
        });

        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "BlogPost",
          entityId: post.id,
          summary: post.title,
        });
        bumpTags(CACHE_TAGS.blog, CACHE_TAGS.homepage);
        return mcpJson({ post });
      } catch (err) {
        return mcpError(err, "create_blog_post failed");
      }
    },
  );

  server.registerTool(
    "update_blog_post",
    {
      title: "Update blog post",
      description:
        "Update a blog post by id with a FULL payload (same schema as create). Call get_blog_post first and send back every field. categorySlug validation and slug uniqueness apply.",
      inputSchema: { id: z.string(), ...BlogPostSchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { id, ...rest } = args;
        const d = BlogPostSchema.parse(rest);

        // Validate categorySlug if provided
        if (d.categorySlug) {
          const category = await prisma.blogCategory.findUnique({
            where: { slug: d.categorySlug },
            select: { slug: true },
          });
          if (!category) {
            const available = await prisma.blogCategory.findMany({
              select: { slug: true, name: true },
              orderBy: { name: "asc" },
            });
            throw new CmsError(
              `No blog category with slug "${d.categorySlug}".`,
              {
                statusCode: 400,
                referenceKind: "BlogCategory",
                availableOptions: available.map(
                  (c) => `${c.slug} (${c.name})`,
                ),
              },
            );
          }
        }

        // Check slug uniqueness (exclude current post)
        const existing = await prisma.blogPost.findUnique({
          where: { slug: d.slug },
          select: { id: true },
        });
        if (existing && existing.id !== id) {
          throw new CmsError(`Slug "${d.slug}" is already taken.`, {
            statusCode: 409,
          });
        }

        const post = await prisma.blogPost.update({
          where: { id },
          data: {
            slug: d.slug,
            title: d.title,
            titleNe: d.titleNe ?? null,
            excerpt: d.excerpt,
            excerptNe: d.excerptNe ?? null,
            bodyMarkdown: d.bodyMarkdown,
            bodyMarkdownNe: d.bodyMarkdownNe ?? null,
            heroImageUrl: d.heroImageUrl ?? null,
            heroVideoEmbedUrl: d.heroVideoEmbedUrl,
            authorName: d.authorName,
            categorySlug: d.categorySlug ?? null,
            tags: d.tags,
            isFeatured: d.isFeatured,
            status: d.status,
            publishedAt: d.publishedAt
              ? new Date(d.publishedAt)
              : d.status === "published"
                ? new Date()
                : null,
            readingMinutes: d.readingMinutes,
            seoTitle: d.seoTitle ?? null,
            seoTitleNe: d.seoTitleNe ?? null,
            seoDescription: d.seoDescription ?? null,
            seoDescriptionNe: d.seoDescriptionNe ?? null,
            ogImageUrl: d.ogImageUrl || null,
            canonicalUrl: d.canonicalUrl || null,
            noindex: d.noindex ?? false,
            twitterCard: d.twitterCard ?? "summary_large_image",
            lastEditedBy: ctx.actor,
          },
        });

        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "BlogPost",
          entityId: id,
          summary: post.title,
        });
        bumpTags(CACHE_TAGS.blog, CACHE_TAGS.homepage);
        return mcpJson({ post });
      } catch (err) {
        return mcpError(err, "update_blog_post failed");
      }
    },
  );

  server.registerTool(
    "list_blog_categories",
    {
      title: "List blog categories",
      description:
        "List blog categories (slug, name, description). Use to find category slugs for blog post categorySlug field.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const categories = await prisma.blogCategory.findMany({
          orderBy: { name: "asc" },
          select: {
            slug: true,
            name: true,
            nameNe: true,
            description: true,
            descriptionNe: true,
          },
        });
        return mcpJson({ categories });
      } catch (err) {
        return mcpError(err, "list_blog_categories failed");
      }
    },
  );

  server.registerTool(
    "create_blog_category",
    {
      title: "Create blog category",
      description:
        "Create a blog category. Slug must be lower-kebab-case and unique.",
      inputSchema: BlogCategorySchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = BlogCategorySchema.parse(args);

        // Check slug uniqueness
        const existing = await prisma.blogCategory.findUnique({
          where: { slug: d.slug },
          select: { slug: true },
        });
        if (existing) {
          throw new CmsError(`Slug "${d.slug}" is already taken.`, {
            statusCode: 409,
          });
        }

        const category = await prisma.blogCategory.create({
          data: {
            slug: d.slug,
            name: d.name,
            nameNe: d.nameNe ?? null,
            description: d.description ?? null,
            descriptionNe: d.descriptionNe ?? null,
          },
        });

        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "BlogCategory",
          entityId: category.slug,
          summary: category.name,
        });
        bumpTags(CACHE_TAGS.blog, CACHE_TAGS.blogCategories);
        return mcpJson({ category });
      } catch (err) {
        return mcpError(err, "create_blog_category failed");
      }
    },
  );

  server.registerTool(
    "update_blog_category",
    {
      title: "Update blog category",
      description:
        "Update a blog category with a FULL payload (same schema as create). `currentSlug` identifies the category; the payload's `slug` may differ to rename it.",
      inputSchema: { currentSlug: z.string(), ...BlogCategorySchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { currentSlug, ...rest } = args;
        const d = BlogCategorySchema.parse(rest);

        // Check slug uniqueness (exclude current category)
        if (d.slug !== currentSlug) {
          const existing = await prisma.blogCategory.findUnique({
            where: { slug: d.slug },
            select: { slug: true },
          });
          if (existing) {
            throw new CmsError(`Slug "${d.slug}" is already taken.`, {
              statusCode: 409,
            });
          }
        }

        const category = await prisma.blogCategory.update({
          where: { slug: currentSlug },
          data: {
            slug: d.slug,
            name: d.name,
            nameNe: d.nameNe ?? null,
            description: d.description ?? null,
            descriptionNe: d.descriptionNe ?? null,
          },
        });

        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "BlogCategory",
          entityId: category.slug,
          summary: category.name,
        });
        bumpTags(CACHE_TAGS.blog, CACHE_TAGS.blogCategories);
        return mcpJson({ category });
      } catch (err) {
        return mcpError(err, "update_blog_category failed");
      }
    },
  );

  server.registerTool(
    "list_blog_tags",
    {
      title: "List blog tags",
      description:
        "List all blog tags with post counts (name, postCount), sorted alphabetically. Computed by aggregating tags from all posts.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const posts = await prisma.blogPost.findMany({
          select: { tags: true },
        });
        const counts = new Map<string, number>();
        for (const p of posts) {
          for (const t of p.tags) {
            counts.set(t, (counts.get(t) ?? 0) + 1);
          }
        }
        const tags = [...counts.entries()]
          .map(([name, postCount]) => ({ name, postCount }))
          .sort((a, b) => a.name.localeCompare(b.name));
        return mcpJson({ tags });
      } catch (err) {
        return mcpError(err, "list_blog_tags failed");
      }
    },
  );

  server.registerTool(
    "rename_blog_tag",
    {
      title: "Rename blog tag",
      description:
        "Rename a blog tag by replacing the old name with a new one across all posts that use it. Pass from (old tag name) and to (new tag name). If from=to, no-op.",
      inputSchema: {
        from: z.string().min(1),
        to: z.string().min(1),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { from, to } = args;

        if (from === to) {
          return mcpJson({ updated: 0 });
        }

        const affected = await prisma.blogPost.findMany({
          where: { tags: { has: from } },
          select: { id: true, tags: true },
        });

        for (const p of affected) {
          const next = Array.from(
            new Set(p.tags.map((t) => (t === from ? to : t))),
          );
          await prisma.blogPost.update({
            where: { id: p.id },
            data: { tags: next },
          });
        }

        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "BlogTag",
          entityId: from,
          summary: `Renamed "${from}" → "${to}" on ${affected.length} post(s)`,
        });
        bumpTags(CACHE_TAGS.blog);
        return mcpJson({ updated: affected.length });
      } catch (err) {
        return mcpError(err, "rename_blog_tag failed");
      }
    },
  );
}
