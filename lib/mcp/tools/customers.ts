// MCP tools for customer accounts — read-only by design. Accounts are
// created by storefront registration; there is no create/update/delete
// surface here (password hashes and sessions must stay out of MCP reach).

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerCustomerTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_customers",
    {
      title: "List customers",
      description:
        "List storefront customer accounts, newest first, with order counts. Optional case-insensitive search over email and name. Paginated (limit 1-100, default 25).",
      inputSchema: {
        search: z.string().optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const page = args.page ?? 1;
        const limit = args.limit ?? 25;
        const search = args.search?.trim();
        const where = search
          ? {
              OR: [
                { email: { contains: search, mode: "insensitive" as const } },
                { name: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {};
        const [rows, total] = await Promise.all([
          prisma.customer.findMany({
            where,
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              lastLoginAt: true,
              createdAt: true,
              _count: { select: { orders: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.customer.count({ where }),
        ]);
        return mcpJson({
          customers: rows.map((c) => ({
            id: c.id,
            email: c.email,
            name: c.name,
            phone: c.phone,
            orderCount: c._count.orders,
            lastLoginAt: c.lastLoginAt?.toISOString() ?? null,
            createdAt: c.createdAt.toISOString(),
          })),
          total,
          page,
          limit,
        });
      } catch (err) {
        return mcpError(err, "list_customers failed");
      }
    },
  );

  server.registerTool(
    "get_customer",
    {
      title: "Get customer detail",
      description:
        "Customer profile by id or email (pass exactly one), including their 10 most recent orders.",
      inputSchema: {
        id: z.string().optional(),
        email: z.string().optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        if (!args.id === !args.email) {
          throw new CmsError("Pass exactly one of id or email", {
            statusCode: 400,
          });
        }
        const customer = await prisma.customer.findUnique({
          where: args.id
            ? { id: args.id }
            : { email: args.email!.toLowerCase() },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            lastLoginAt: true,
            createdAt: true,
            orders: {
              select: {
                number: true,
                status: true,
                paymentStatus: true,
                total: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
              take: 10,
            },
          },
        });
        if (!customer) {
          throw new CmsError(
            "Customer not found — call list_customers to search.",
            { statusCode: 404 },
          );
        }
        return mcpJson({ customer });
      } catch (err) {
        return mcpError(err, "get_customer failed");
      }
    },
  );
}
