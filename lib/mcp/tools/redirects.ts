// MCP tools for the Redirect module. Mirrors /api/sysuser/redirects — direct
// Prisma calls, then audit-log. fromPath uniqueness triggers CmsError 409 so
// the AI can self-correct. CRU only: no delete tool by design.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { RedirectSchema } from "@/lib/validation/schemas";
import { logAction } from "@/lib/audit";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerRedirectTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_redirects",
    {
      title: "List redirects",
      description:
        "List all redirects (id, fromPath, toPath, statusCode, enabled, note). Ordered by most recently updated first.",
      inputSchema: {},
    },
    async () => {
      try {
        requireMcpRole(ctx, "viewer");
        const redirects = await prisma.redirect.findMany({
          orderBy: { updatedAt: "desc" },
        });
        return mcpJson({ redirects });
      } catch (err) {
        return mcpError(err, "list_redirects failed");
      }
    },
  );

  server.registerTool(
    "create_redirect",
    {
      title: "Create redirect",
      description:
        "Create a redirect. fromPath must be unique and start with /. statusCode is one of 301, 302, 307, 308 (default 308). enabled defaults to true.",
      inputSchema: RedirectSchema.shape,
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const d = RedirectSchema.parse(args);
        let redirect;
        try {
          redirect = await prisma.redirect.create({
            data: { ...d, note: d.note ?? null },
          });
        } catch (dbErr: unknown) {
          // Prisma unique constraint error on fromPath
          if (
            dbErr &&
            typeof dbErr === "object" &&
            "code" in dbErr &&
            dbErr.code === "P2002"
          ) {
            throw new CmsError(
              `A redirect for that fromPath already exists.`,
              { statusCode: 409 },
            );
          }
          throw dbErr;
        }
        logAction({
          actor: ctx.actor,
          action: "create",
          entity: "Redirect",
          entityId: redirect.id,
          summary: `${redirect.fromPath} → ${redirect.toPath}`,
        });
        return mcpJson({ redirect });
      } catch (err) {
        return mcpError(err, "create_redirect failed");
      }
    },
  );

  server.registerTool(
    "update_redirect",
    {
      title: "Update redirect",
      description:
        "Update a redirect by id with a FULL payload (same schema as create). Call list_redirects first to find the id.",
      inputSchema: { id: z.string(), ...RedirectSchema.shape },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { id, ...rest } = args;
        const d = RedirectSchema.parse(rest);
        let redirect;
        try {
          redirect = await prisma.redirect.update({
            where: { id },
            data: { ...d, note: d.note ?? null },
          });
        } catch (dbErr: unknown) {
          // Prisma unique constraint error on fromPath
          if (
            dbErr &&
            typeof dbErr === "object" &&
            "code" in dbErr &&
            dbErr.code === "P2002"
          ) {
            throw new CmsError(
              `A redirect for that fromPath already exists.`,
              { statusCode: 409 },
            );
          }
          throw dbErr;
        }
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Redirect",
          entityId: id,
          summary: `${redirect.fromPath} → ${redirect.toPath}`,
        });
        return mcpJson({ redirect });
      } catch (err) {
        return mcpError(err, "update_redirect failed");
      }
    },
  );
}
