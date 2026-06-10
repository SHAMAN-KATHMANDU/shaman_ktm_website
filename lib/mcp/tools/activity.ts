// MCP tools for the Activity module. Read-only access to admin audit logs
// from /api/sysuser/activity. Mirrors GET /api/sysuser/activity/route.ts
// with limit (1-200, default 50) pagination.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerActivityTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_admin_activity",
    {
      title: "List admin activity",
      description:
        "Fetch recent admin audit logs ordered by createdAt descending. limit=1-200 (default 50). Each entry has actor, action, entity, entityId, summary, and createdAt.",
      inputSchema: {
        limit: z.number().int().min(1).max(200).optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const take = Math.min(200, Math.max(1, args.limit ?? 50));

        const entries = await prisma.adminLog.findMany({
          orderBy: { createdAt: "desc" },
          take,
        });

        return mcpJson({ entries });
      } catch (err) {
        return mcpError(err, "list_admin_activity failed");
      }
    },
  );
}
