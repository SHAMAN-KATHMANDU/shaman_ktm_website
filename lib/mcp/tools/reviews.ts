// MCP tools for the Review module. Mirrors /api/sysuser/reviews — reads query
// reviews by status/productId, write tool sets approval status. Updates go
// through Prisma with logAction and cache tag bumps matching the REST routes.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { bumpTags } from "@/lib/api/server/respond";
import { CACHE_TAGS } from "@/lib/api/server/tags";
import { logAction } from "@/lib/audit";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerReviewTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_reviews",
    {
      title: "List reviews",
      description:
        "List product reviews with filters: status=pending|approved|all (default all), optional productId, page (1-indexed), pageSize (1-100, default 25). Include product name and approval metadata.",
      inputSchema: {
        status: z.enum(["pending", "approved", "all"]).optional(),
        productId: z.string().optional(),
        page: z.number().int().positive().optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const status = args.status ?? "all";
        const productId = args.productId;
        const page = Math.max(1, args.page ?? 1);
        const pageSize = Math.min(100, Math.max(1, args.pageSize ?? 25));

        const where: Record<string, unknown> = {};
        if (status === "pending") where.isApproved = false;
        else if (status === "approved") where.isApproved = true;
        if (productId) where.productId = productId;

        const [reviews, total] = await Promise.all([
          prisma.review.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
              product: { select: { id: true, name: true, slug: true } },
            },
          }),
          prisma.review.count({ where }),
        ]);

        return mcpJson({
          reviews,
          meta: { total, page, pageSize },
        });
      } catch (err) {
        return mcpError(err, "list_reviews failed");
      }
    },
  );

  server.registerTool(
    "set_review_approval",
    {
      title: "Approve or reject a review",
      description:
        "Set a review's approval status by id. Pass isApproved=true to approve (sets approvedAt and approvedBy), false to unpublish. Logs the action and bumps product cache.",
      inputSchema: {
        id: z.string(),
        isApproved: z.boolean(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const { id, isApproved } = args;

        const updated = await prisma.review.update({
          where: { id },
          data: {
            isApproved,
            approvedAt: isApproved ? new Date() : null,
            approvedBy: isApproved ? ctx.actor : null,
          },
        });

        logAction({
          actor: ctx.actor,
          action: isApproved ? "publish" : "unpublish",
          entity: "Review",
          entityId: id,
          summary: `${updated.rating}★ "${updated.title}"`,
        });
        bumpTags(CACHE_TAGS.products);

        return mcpJson({ review: updated });
      } catch (err) {
        return mcpError(err, "set_review_approval failed");
      }
    },
  );
}
