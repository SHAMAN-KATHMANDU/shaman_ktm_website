// MCP tools for the Element module. Mirrors /api/sysuser/elements — direct
// Prisma calls, then audit-log and bump the same cache tags as the REST routes.
// Elements use slug as the primary identifier; update allows partial slug changes.
// CRU only: no delete tool by design.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { ElementSchema } from "@/lib/validation/schemas";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerElementTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_elements",
    {
      title: "List elements",
      description:
        "List all elements (slug, name, icon, accent, natureSource, energyDescription, position). Ordered by position then slug. These are the six core elements: metal, earth, wood, plant, water, air.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const elements = await prisma.element.findMany({
          orderBy: [{ position: "asc" }, { slug: "asc" }],
        });
        return mcpJson({ elements });
      } catch (err) {
        return mcpError(err, "list_elements failed");
      }
    },
  );

  server.registerTool(
    "create_element",
    {
      title: "Create element",
      description:
        "Create an element. Slug must be unique, lower-kebab-case. Typically one of: metal, earth, wood, plant, water, air. Position defaults to 0.",
      inputSchema: ElementSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = ElementSchema.parse(args);
        const element = await prisma.element.create({ data: d });
        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "Element",
          entityId: element.slug,
          summary: element.name,
        });
        bumpTags(CACHE_TAGS.elements);
        return mcpJson({ element });
      } catch (err) {
        return mcpError(err, "create_element failed");
      }
    },
  );

  server.registerTool(
    "update_element",
    {
      title: "Update element",
      description:
        "Update an element by its original slug (`currentSlug`). Payload allows partial updates — only the provided fields are changed. To rename an element, include the new slug.",
      inputSchema: {
        currentSlug: z.string(),
        ...ElementSchema.partial({ slug: true }).shape,
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { currentSlug, ...rest } = args;
        const d = ElementSchema.partial({ slug: true }).parse(rest);
        const element = await prisma.element.update({
          where: { slug: currentSlug },
          data: { ...d, slug: d.slug ?? currentSlug },
        });
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Element",
          entityId: element.slug,
          summary: element.name,
        });
        bumpTags(CACHE_TAGS.elements);
        return mcpJson({ element });
      } catch (err) {
        return mcpError(err, "update_element failed");
      }
    },
  );
}
