// MCP tools for customer orders. Deliberately narrower than CRU: orders are
// created by the storefront checkout only, and never deleted — so the surface
// is list/get plus a status-transition tool that shares lib/orders logic
// (timeline event, stock restore on cancel, customer email) with the admin
// REST route.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/db";
import { logAction } from "@/lib/audit";
import { updateOrderStatus } from "@/lib/orders";
import { ORDER_STATUSES } from "@/lib/orders/constants";
import { CmsError } from "@/lib/cms/errors";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerOrderTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_orders",
    {
      title: "List orders",
      description:
        "List customer orders, newest first. Optional status filter (pending | confirmed | shipped | delivered | cancelled). Returns number, customer email/name, status, paymentStatus, total (NPR), itemCount, deliveryZone, createdAt. Paginated (limit 1-100, default 25).",
      inputSchema: {
        status: z.enum(ORDER_STATUSES).optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const page = args.page ?? 1;
        const limit = args.limit ?? 25;
        const where = args.status ? { status: args.status } : {};
        const [rows, total] = await Promise.all([
          prisma.order.findMany({
            where,
            include: {
              customer: { select: { email: true, name: true } },
              _count: { select: { items: true } },
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
          }),
          prisma.order.count({ where }),
        ]);
        return mcpJson({
          orders: rows.map((o) => ({
            number: o.number,
            customerEmail: o.customer.email,
            customerName: o.customer.name,
            status: o.status,
            paymentStatus: o.paymentStatus,
            total: o.total,
            itemCount: o._count.items,
            deliveryZone: o.deliveryZone,
            createdAt: o.createdAt.toISOString(),
          })),
          total,
          page,
          limit,
        });
      } catch (err) {
        return mcpError(err, "list_orders failed");
      }
    },
  );

  server.registerTool(
    "get_order",
    {
      title: "Get order detail",
      description:
        "Full order detail by order number (e.g. \"SK-000042\"): customer, delivery address, items with price snapshots, the status-event timeline, payment attempts (online gateways), and courier tracking (when a shipment has been booked).",
      inputSchema: {
        number: z.string().min(1),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const order = await prisma.order.findUnique({
          where: { number: args.number },
          include: {
            customer: {
              select: { id: true, email: true, name: true, phone: true },
            },
            items: true,
            statusEvents: { orderBy: { createdAt: "asc" } },
            paymentTransactions: { orderBy: { createdAt: "desc" } },
            shipment: true,
          },
        });
        if (!order) {
          throw new CmsError(
            `Order "${args.number}" not found — call list_orders for valid numbers.`,
            { statusCode: 404 },
          );
        }
        return mcpJson({ order });
      } catch (err) {
        return mcpError(err, "get_order failed");
      }
    },
  );

  server.registerTool(
    "update_order_status",
    {
      title: "Update order status",
      description:
        "Move an order (by number) to a new status. Legal transitions: pending → confirmed|cancelled, confirmed → shipped|cancelled, shipped → delivered. Appends a timeline event, restores variation stock on cancellation, marks COD payment collected on delivery, and emails the customer (notes are included in that email).",
      inputSchema: {
        number: z.string().min(1),
        status: z.enum(ORDER_STATUSES),
        notes: z.string().max(500).optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "editor");
        const existing = await prisma.order.findUnique({
          where: { number: args.number },
          select: { id: true },
        });
        if (!existing) {
          throw new CmsError(
            `Order "${args.number}" not found — call list_orders for valid numbers.`,
            { statusCode: 404 },
          );
        }
        const order = await updateOrderStatus(existing.id, args.status, {
          notes: args.notes,
          actor: ctx.actor,
        });
        logAction({
          actor: ctx.actor,
          action: "update",
          entity: "Order",
          entityId: order.id,
          summary: `${order.number} → ${args.status}`,
        });
        return mcpJson({ order });
      } catch (err) {
        return mcpError(err, "update_order_status failed");
      }
    },
  );
}
