// MCP tools for the sales spine (reporting system, Module B).
//
// Read-only. The four sales asks in the brief — online, Gongabu showroom,
// wholesale, delivery — are all filters over this one table, so a monthly
// report is `list_sales` with a channel and a date range, not four queries
// against four systems.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listSales, getSale } from "@/lib/sales";
import {
  SALE_CHANNELS,
  SALE_STATUSES,
  type SaleChannel,
  type SaleStatus,
} from "@/lib/sales/constants";
import { mcpJson, mcpError, requireMcpRole } from "../respond";
import type { McpContext } from "../auth";

export function registerSalesTools(server: McpServer, ctx: McpContext) {
  server.registerTool(
    "list_sales",
    {
      title: "List sales",
      description: `Sales across every channel (${SALE_CHANNELS.join(" | ")}), newest first, with a netRevenue total for the same filters. Statuses: ${SALE_STATUSES.join(" | ")} — a draft is recorded but not yet counted and holds no stock; confirmed is real; void means it was reversed. netRevenue sums every non-draft row, so a voided sale keeps its amount in the month it happened while its reversal carries the negative into the month of the correction — an already-closed month never changes retroactively. Amounts are whole NPR rupees. Every row carries both calendars (dateAd and dateBs). Filter by channel, status, showroomKey, crmLeadId, customerId, and a dateAd range. Paginated (limit 1-500, default 100).`,
      inputSchema: {
        channel: z.enum(SALE_CHANNELS).optional(),
        status: z.enum(SALE_STATUSES).optional(),
        showroomKey: z.string().optional().describe("e.g. thamel | gongabu"),
        crmLeadId: z.string().optional(),
        customerId: z.string().optional(),
        from: z
          .string()
          .datetime()
          .optional()
          .describe("ISO 8601 start of the dateAd range, inclusive"),
        to: z
          .string()
          .datetime()
          .optional()
          .describe("ISO 8601 end of the dateAd range, inclusive"),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const { sales, total, page, limit, netRevenue } = await listSales({
          channel: args.channel as SaleChannel | undefined,
          status: args.status as SaleStatus | undefined,
          showroomKey: args.showroomKey,
          crmLeadId: args.crmLeadId,
          customerId: args.customerId,
          from: args.from ? new Date(args.from) : undefined,
          to: args.to ? new Date(args.to) : undefined,
          page: args.page,
          limit: args.limit,
        });
        return mcpJson({
          sales: sales.map((s) => ({
            id: s.id,
            saleNo: s.saleNo,
            channel: s.channel,
            status: s.status,
            showroomKey: s.showroomKey,
            showroom: s.showroom?.name ?? null,
            dateAd: s.dateAd.toISOString(),
            dateBs: s.dateBs,
            subtotal: s.subtotal,
            discountAmount: s.discountAmount,
            deliveryFee: s.deliveryFee,
            totalAmount: s.totalAmount,
            paymentMethod: s.paymentMethod?.label ?? null,
            paymentRef: s.paymentRef,
            lineCount: s._count.lines,
            crmLeadId: s.crmLeadId,
            crmLead: s.crmLead?.name ?? null,
            customerId: s.customerId,
            orderId: s.orderId,
            reversesSaleId: s.reversesSaleId,
            inputSource: s.inputSource,
            enteredBy: s.enteredByStaff?.name ?? null,
            enteredAt: s.enteredAt.toISOString(),
            staff: s.staff.map((st) => ({
              name: st.staff.name,
              role: st.role,
            })),
          })),
          netRevenue,
          total,
          page,
          limit,
        });
      } catch (err) {
        return mcpError(err, "list_sales failed");
      }
    },
  );

  server.registerTool(
    "get_sale",
    {
      title: "Get sale",
      description:
        "One sale with its line items (each carrying the product name, SKU, variant label, quantity, MRP and price snapshotted at sale time), staff attribution by role (sold_by | assisted | delivered), payment details, and the correction chain: `reverses` points at the sale this one reverses, `reversedBy` at the reversal that voided this one. A confirmed sale is immutable — corrections are always a new reversing sale, never an edit. Get ids from list_sales.",
      inputSchema: { id: z.string().min(1) },
    },
    async (args) => {
      try {
        requireMcpRole(ctx, "viewer");
        const s = await getSale(args.id);
        return mcpJson({
          sale: {
            id: s.id,
            saleNo: s.saleNo,
            channel: s.channel,
            status: s.status,
            showroomKey: s.showroomKey,
            showroom: s.showroom?.name ?? null,
            dateAd: s.dateAd.toISOString(),
            dateBs: s.dateBs,
            subtotal: s.subtotal,
            discountAmount: s.discountAmount,
            deliveryFee: s.deliveryFee,
            totalAmount: s.totalAmount,
            payment: {
              method: s.paymentMethod?.label ?? null,
              channel: s.paymentMethod?.channel ?? null,
              ref: s.paymentRef,
              evidenceUrl: s.paymentEvidenceUrl,
            },
            customer: s.customer
              ? { id: s.customer.id, name: s.customer.name, email: s.customer.email }
              : null,
            crmLead: s.crmLead
              ? { id: s.crmLead.id, name: s.crmLead.name, status: s.crmLead.status }
              : null,
            b2bAccountId: s.b2bAccountId,
            orderId: s.orderId,
            inputSource: s.inputSource,
            enteredBy: s.enteredByStaff?.name ?? null,
            enteredAt: s.enteredAt.toISOString(),
            confirmedAt: s.confirmedAt?.toISOString() ?? null,
            voidedAt: s.voidedAt?.toISOString() ?? null,
            notes: s.notes,
            reverses: s.reverses
              ? { id: s.reverses.id, saleNo: s.reverses.saleNo }
              : null,
            reversedBy: s.reversedBy
              ? { id: s.reversedBy.id, saleNo: s.reversedBy.saleNo }
              : null,
            staff: s.staff.map((st) => ({ name: st.staff.name, role: st.role })),
            lines: s.lines.map((l) => ({
              productId: l.productId,
              variationId: l.variationId,
              productName: l.productName,
              variantLabel: l.variantLabel,
              sku: l.sku,
              qty: l.qty,
              unitMrp: l.unitMrp,
              unitPrice: l.unitPrice,
              lineDiscount: l.lineDiscount,
              lineTotal: l.lineTotal,
              note: l.note,
            })),
          },
        });
      } catch (err) {
        return mcpError(err, "get_sale failed");
      }
    },
  );
}
