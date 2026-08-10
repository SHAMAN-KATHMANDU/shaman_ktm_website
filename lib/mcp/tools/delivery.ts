// MCP tool for the delivery log (reporting system, PR 4a).
//
// The thirteenth vault-sync tool. The other twelve cover CRM, sales, stock, B2B
// and marketing; this one answers the delivery half of the monthly report —
// what went out, with whom, how much cash came back, and how often a parcel
// failed to arrive first time.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listDeliveryLog, countDeliveryEvents } from "@/lib/fulfilment";
import {
  DELIVERY_EVENTS,
  type DeliveryEventName,
} from "@/lib/fulfilment/constants";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerDeliveryTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_delivery_log",
    {
      title: "List delivery events",
      description: `The append-only delivery log: one row per real thing that happened to a parcel, newest first. Events: ${DELIVERY_EVENTS.join(" | ")}. Every row carries both calendars (createdAt and dateBs), the order it belongs to, the courier if one was used, the staff member who recorded it, and codCollected where cash changed hands at the door. \`counts\` gives totals per event for the same filters MINUS the event filter, so a period's "delivered vs failed_attempt" is one call. Note this is the PHYSICAL journey, not the customer-facing status: an order's status (pending|confirmed|shipped|delivered|cancelled) lives on the order itself and is moved by update_order_status; a dispatch recorded here advances it automatically. Corrections are new events, never edits — there is deliberately no way to change or remove one. Filter by orderId, event, courierId, staffId and a date range. Paginated (limit 1-500, default 100).`,
      inputSchema: {
        orderId: z.string().optional(),
        event: z.enum(DELIVERY_EVENTS).optional(),
        courierId: z.string().optional(),
        staffId: z.string().optional(),
        from: z.string().datetime().optional().describe("ISO 8601 start, inclusive"),
        to: z.string().datetime().optional().describe("ISO 8601 end, inclusive"),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const filters = {
          orderId: args.orderId,
          courierId: args.courierId,
          staffId: args.staffId,
          from: args.from ? new Date(args.from) : undefined,
          to: args.to ? new Date(args.to) : undefined,
        };
        const [r, counts] = await Promise.all([
          listDeliveryLog({
            ...filters,
            event: args.event as DeliveryEventName | undefined,
            page: args.page,
            limit: args.limit,
          }),
          countDeliveryEvents(filters),
        ]);
        return mcpJson({
          events: r.events.map((e) => ({
            id: e.id,
            event: e.event,
            orderId: e.orderId,
            orderNumber: e.order.number,
            deliveryZone: e.order.deliveryZone,
            orderTotal: e.order.total,
            courier: e.courier?.label ?? null,
            courierId: e.courierId,
            trackingRef: e.trackingRef,
            codCollected: e.codCollected,
            landmark: e.landmark,
            recipientPhone: e.recipientPhone,
            staff: e.staff?.name ?? null,
            staffId: e.staffId,
            note: e.note,
            createdAt: e.createdAt.toISOString(),
            dateBs: e.dateBs,
          })),
          counts,
          total: r.total,
          page: r.page,
          limit: r.limit,
        });
      } catch (err) {
        return mcpError(err, "list_delivery_log failed");
      }
    },
  );
}
